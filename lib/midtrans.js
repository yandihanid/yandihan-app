// Satu tempat untuk semua urusan Midtrans.
//
// Sebelumnya endpoint-nya di-hardcode ke SANDBOX di dua file berbeda
// (app/api/payment/route.js dan app/api/payment/verify/route.js), sementara
// env MIDTRANS_IS_PRODUCTION ada tapi tidak pernah dibaca. Artinya pembayaran
// sungguhan tidak akan pernah masuk sekalipun kredensial produksi diisi.
import 'server-only'
import { createHash } from 'node:crypto'

export function isMidtransProduction() {
  return String(process.env.MIDTRANS_IS_PRODUCTION).toLowerCase() === 'true'
}

export function snapApiUrl() {
  return isMidtransProduction()
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'
}

export function statusApiUrl(orderId) {
  const base = isMidtransProduction()
    ? 'https://api.midtrans.com/v2'
    : 'https://api.sandbox.midtrans.com/v2'
  return `${base}/${encodeURIComponent(orderId)}/status`
}

export function midtransAuthHeader() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
  return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`
}

/**
 * Verifikasi signature_key notifikasi Midtrans.
 *
 * signature_key = SHA-512( order_id + status_code + gross_amount + server_key )
 *
 * Ini satu-satunya hal yang membedakan notifikasi asli dari POST siapa pun ke
 * URL webhook. Sebelum ini webhook memproses body apa pun tanpa verifikasi.
 *
 * gross_amount harus dipakai APA ADANYA dari body (Midtrans mengirim
 * "78000.00"); menormalkan atau membulatkannya akan membuat hash tidak cocok.
 */
export function verifyMidtransSignature({ order_id, status_code, gross_amount, signature_key }) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey || !signature_key || !order_id || !status_code || gross_amount == null) {
    return false
  }

  const expected = createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest('hex')

  return timingSafeEqualHex(expected, String(signature_key))
}

/** Perbandingan waktu-konstan supaya panjang prefix yang cocok tidak bisa diukur. */
function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/** Status Midtrans yang berarti "uangnya sudah masuk". */
export function isPaidStatus({ transaction_status, fraud_status }) {
  if (transaction_status === 'settlement') return true
  if (transaction_status === 'capture') return fraud_status === 'accept'
  return false
}
