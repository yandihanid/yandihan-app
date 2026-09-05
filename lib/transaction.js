import 'server-only'
import { formatRupiah } from '@/lib/format'

/**
 * Satu pintu masuk transaksi untuk SEMUA jalur ingest.
 *
 * Sebelumnya jalur web (app/c/[token]/actions.js) dan jalur Telegram
 * (app/api/telegram/webhook/route.js) punya aturan bisnisnya masing-masing:
 * yang web mengurangi stok dan menghitung diskon, yang Telegram tidak
 * mengurangi stok sama sekali dan tidak pernah men-set status (temuan C10).
 * Keduanya sekarang memanggil RPC `submit_transaction()` yang sama, jadi hanya
 * ada satu tempat yang menentukan harga, stok, diskon, dan status.
 *
 * Modul ini sengaja `server-only`: parameternya termasuk token kasir mentah.
 */

export const MAX_LINES = 50
export const MAX_QTY = 999
export const PAYMENT_METHODS = new Set(['CASH', 'QRIS/TF'])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Pesan untuk setiap error_code yang bisa dikembalikan RPC. */
const MESSAGES = {
  invalid_token: 'Link kasir tidak valid. Minta link baru dari pemilik toko.',
  invalid_payment_method: 'Metode pembayaran belum dipilih.',
  empty_items: 'Belum ada item yang dipilih.',
  too_many_items: `Maksimal ${MAX_LINES} baris item per transaksi.`,
  bad_item: 'Ada item tanpa produk yang dipilih.',
  bad_qty: `Jumlah item harus antara 1 dan ${MAX_QTY}.`,
  sub_product_required: 'Setiap produk wajib memiliki sub-produk.',
  customer_name_required: 'Nama pembeli wajib diisi.',
  receipt_required: 'Bukti pembayaran wajib untuk QRIS/Transfer.',
  product_unavailable: 'Ada produk yang sudah tidak tersedia. Muat ulang halaman.',
  invalid_total: 'Total transaksi tidak valid.',
}

function toQty(value) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1 || n > MAX_QTY) return null
  return n
}

/**
 * Validasi BENTUK payload item. Bukan pengganti validasi di RPC -- yang
 * otoritatif tetap di database -- tapi memberi pesan yang jauh lebih jelas
 * daripada error_code generik, dan menolak sampah sebelum menyentuh DB.
 *
 * Menerima array atau string JSON. Bentuk:
 *   [{ product_id, qty, subs: [{ product_id, qty }] }]
 */
export function normalizeItems(raw) {
  let parsed = raw
  if (typeof raw === 'string') {
    if (!raw.trim()) return { error: MESSAGES.empty_items }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { error: 'Data item tidak valid. Muat ulang halaman.' }
    }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return { error: MESSAGES.empty_items }
  if (parsed.length > MAX_LINES) return { error: MESSAGES.too_many_items }

  const items = []
  for (const item of parsed) {
    if (!UUID_RE.test(item?.product_id || '')) return { error: MESSAGES.bad_item }
    const qty = toQty(item.qty)
    if (!qty) return { error: MESSAGES.bad_qty }

    const rawSubs = Array.isArray(item.subs) ? item.subs : []
    if (rawSubs.length > MAX_LINES) return { error: 'Terlalu banyak sub-produk pada satu item.' }

    const subs = []
    for (const sub of rawSubs) {
      if (!UUID_RE.test(sub?.product_id || '')) return { error: 'Ada sub-produk tanpa produk yang dipilih.' }
      const subQty = toQty(sub.qty)
      if (!subQty) return { error: MESSAGES.bad_qty }
      subs.push({ product_id: sub.product_id, qty: subQty })
    }

    items.push({ product_id: item.product_id, qty, subs })
  }

  return { items }
}

/** error_code + detail dari RPC -> pesan bahasa Indonesia. */
function messageFor(result) {
  const code = result?.error_code
  if (code === 'insufficient_stock') {
    const left = Number(result.stock_left ?? 0)
    return `Stok "${result.detail}" tidak cukup (tersisa ${left}).`
  }
  if (code === 'cash_insufficient') {
    return `Uang tidak cukup. Total ${formatRupiah(result.total)}.`
  }
  return MESSAGES[code] || 'Transaksi gagal diproses. Coba lagi.'
}

/**
 * Panggil RPC submit_transaction().
 *
 * @param supabase klien service-role (RPC-nya hanya di-grant ke service_role)
 * @returns { error } atau { success: true, transactionId, subtotal, discount,
 *          discountPercent, total, cashReceived, changeAmount, status,
 *          productName, idempotent }
 */
export async function submitTransactionRpc(supabase, params) {
  const {
    token,
    items,
    paymentMethod,
    cashReceived = null,
    buyerName = null,
    customerPhone = null,
    clientTxId = null,
    receiptUrl = null,
  } = params

  if (!token) return { error: MESSAGES.invalid_token }
  if (!PAYMENT_METHODS.has(paymentMethod)) return { error: MESSAGES.invalid_payment_method }

  const { data, error } = await supabase.rpc('submit_transaction', {
    p_token: token,
    p_items: items,
    p_payment_method: paymentMethod,
    p_cash_received: cashReceived,
    p_buyer_name: buyerName,
    p_customer_phone: customerPhone,
    p_client_tx_id: clientTxId,
    p_receipt_url: receiptUrl,
  })

  if (error) {
    // 40001 = serialization_failure, dipakai RPC sebagai penanda "stok berubah
    // di tengah proses". Semua error lain tidak pernah diteruskan mentah.
    console.error('submit_transaction gagal', { code: error.code, message: error.message })
    if (error.code === '40001') {
      return { error: 'Stok sedang diubah kasir lain. Kirim ulang sebentar lagi.' }
    }
    if (error.code === '42883' || error.code === 'PGRST202') {
      return { error: 'Fungsi transaksi belum terpasang di database. Jalankan migrasi 0003.' }
    }
    return { error: 'Gagal mencatat transaksi. Coba lagi.' }
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result || result.ok !== true) return { error: messageFor(result) }

  return {
    success: true,
    transactionId: result.transaction_id,
    subtotal: Number(result.subtotal ?? 0),
    discountPercent: Number(result.discount_percent ?? 0),
    discount: Number(result.discount ?? 0),
    total: Number(result.total ?? 0),
    cashReceived: result.cash_received == null ? null : Number(result.cash_received),
    changeAmount: result.change_amount == null ? null : Number(result.change_amount),
    status: result.status || 'completed',
    productName: result.product_name || '',
    idempotent: Boolean(result.idempotent),
  }
}
