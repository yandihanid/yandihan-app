import 'server-only'
import { formatRupiah } from '@/lib/format'
import {
  MAX_LINES,
  MAX_QTY,
  PAYMENT_METHODS,
  TRANSACTION_MESSAGES,
  normalizeItems,
} from '@/lib/transactionValidation'

export { MAX_LINES, MAX_QTY, PAYMENT_METHODS, normalizeItems }

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

const MESSAGES = TRANSACTION_MESSAGES

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
      return { error: 'Fungsi transaksi belum terpasang di database. Jalankan migrasi 0008.' }
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
    queueNumber: result.queue_number == null ? null : Number(result.queue_number),
    productName: result.product_name || '',
    idempotent: Boolean(result.idempotent),
  }
}
