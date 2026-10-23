// Satu tempat untuk semua urusan pembayaran gateway.
// Dulu digunakan Midtrans, sekarang seluruh alur pembayaran (create, verify,
// webhook) sudah digeser ke Xendit. File ini hanya tetap ada untuk kompatibilitas
// import; semua fungsi sudah di-replace oleh lib/xendit.js dan route handler-nya.

// Semua fungsi di bawah ini sekarang mengembalikan nilai default yang aman
// (false/null) agar tidak mempengaruhi alur yang sudah beralih ke Xendit.

export function isMidtransProduction() {
  return false
}

export function snapApiUrl() {
  return 'https://app.midtrans.com/snap/v1/transactions'
}

export function statusApiUrl(orderId) {
  return `https://api.xendit.co/v2/invoices/${orderId}/status`
}

export function midtransAuthHeader() {
  return 'Basic dummy-key-for-compatibility-only'
}

export function verifyMidtransSignature({ order_id, status_code, gross_amount, signature_key }) {
  // Signature verifikasi sekarang dilakukan di lib/xendit.js dan
  // app/api/payment/webhook/route.js menggunakan Xendit callback token.
  return false
}

export function isPaidStatus({ status }) {
  // Status "PAID" atau "SETTLED" sudah divalidasi di level webhook/Xendit
  // atau consume_subscription_order RPC. Fungsi ini selalu false
  // karena verifikasi dilakukan server-side, bukan dari sini.
  return false
}