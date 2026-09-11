export const MAX_LINES = 50
export const MAX_FLAT_ITEMS = 200
export const MAX_QTY = 999
export const PAYMENT_METHODS = new Set(['CASH', 'QRIS/TF'])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const TRANSACTION_MESSAGES = {
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
  client_tx_id_conflict: 'ID transaksi sudah dipakai toko lain. Buat transaksi baru lalu coba lagi.',
  catalog_product_unavailable: 'Data katalog berubah. Muat ulang halaman lalu pilih produk kembali.',
  sub_product_as_main: 'Produk tambahan tidak dapat dijual sebagai produk utama. Muat ulang katalog.',
  main_product_as_sub: 'Produk utama tidak dapat dipakai sebagai tambahan. Muat ulang katalog.',
  invalid_total: 'Total transaksi tidak valid.',
}

function toQty(value) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1 || n > MAX_QTY) return null
  return n
}

/**
 * Validasi bentuk payload item sebelum menyentuh database. Aturan bisnis dan
 * harga tetap otoritatif di RPC submit_transaction().
 */
export function normalizeItems(raw) {
  let parsed = raw
  if (typeof raw === 'string') {
    if (!raw.trim()) return { error: TRANSACTION_MESSAGES.empty_items }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { error: 'Data item tidak valid. Muat ulang halaman.' }
    }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { error: TRANSACTION_MESSAGES.empty_items }
  }
  if (parsed.length > MAX_LINES) return { error: TRANSACTION_MESSAGES.too_many_items }

  const items = []
  let flatItemCount = 0
  for (const item of parsed) {
    if (!UUID_RE.test(item?.product_id || '')) {
      return { error: TRANSACTION_MESSAGES.bad_item }
    }
    const qty = toQty(item.qty)
    if (!qty) return { error: TRANSACTION_MESSAGES.bad_qty }

    const rawSubs = Array.isArray(item.subs) ? item.subs : []
    if (rawSubs.length > MAX_LINES) {
      return { error: 'Terlalu banyak sub-produk pada satu item.' }
    }
    flatItemCount += 1 + rawSubs.length
    if (flatItemCount > MAX_FLAT_ITEMS) {
      return { error: TRANSACTION_MESSAGES.too_many_items }
    }

    const subs = []
    for (const sub of rawSubs) {
      if (!UUID_RE.test(sub?.product_id || '')) {
        return { error: 'Ada sub-produk tanpa produk yang dipilih.' }
      }
      const subQty = toQty(sub.qty)
      if (!subQty) return { error: TRANSACTION_MESSAGES.bad_qty }
      subs.push({ product_id: sub.product_id, qty: subQty })
    }

    items.push({ product_id: item.product_id, qty, subs })
  }

  return { items }
}
