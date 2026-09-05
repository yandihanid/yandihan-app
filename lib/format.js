/** Helper format yang sebelumnya diulang ~15 kali sebagai `Rp ${x.toLocaleString('id-ID')}`. */

export function formatRupiah(value, { withSymbol = true } = {}) {
  const n = Number(value)
  const safe = Number.isFinite(n) ? n : 0
  const body = Math.round(safe).toLocaleString('id-ID')
  return withSymbol ? `Rp ${body}` : body
}

/** "Rp 25.000" / "25000" / "25.000" -> 25000. Mengembalikan null kalau bukan angka. */
export function parseRupiah(input) {
  if (input === null || input === undefined || input === '') return null
  const digits = String(input).replace(/[^\d]/g, '')
  if (!digits) return null
  const n = parseInt(digits, 10)
  return Number.isFinite(n) ? n : null
}

export function formatDateTimeWib(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatDateWib(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Nomor transaksi yang bisa dibaca manusia dari UUID. */
export function shortTxNumber(id) {
  if (!id) return '-'
  return String(id).replace(/-/g, '').slice(0, 8).toUpperCase()
}

/**
 * Normalisasi nomor HP Indonesia ke bentuk 08xxxxxxxxxx.
 *
 * Ada dua versi berbeda dari fungsi ini sebelumnya (app/c/[token]/actions.js
 * dan app/api/pelanggan/route.js). Karena `customers` unik per
 * (store_id, phone), dua normalisasi yang berbeda berarti satu pelanggan bisa
 * jadi dua baris dan hitungan kunjungannya pecah. Sekarang satu sumber.
 *
 * Mengembalikan null kalau tidak menyisakan angka yang masuk akal.
 */
export function normalizePhone(phone) {
  if (!phone) return null
  let cleaned = String(phone).replace(/\D/g, '')
  if (!cleaned) return null
  if (cleaned.startsWith('62')) cleaned = '0' + cleaned.slice(2)
  else if (!cleaned.startsWith('0')) cleaned = '0' + cleaned
  // Nomor Indonesia terpendek 10 digit (mis. 0812345678), terpanjang 14.
  if (cleaned.length < 9 || cleaned.length > 15) return null
  return cleaned
}
