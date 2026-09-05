/**
 * Batas hari WIB (Asia/Jakarta, UTC+7).
 *
 * Sebelumnya batas hari dihitung dengan `new Date().toISOString().split('T')[0]`
 * lalu `${today}T00:00:00Z` .. `${today}T23:59:59Z` — UTC, bukan WIB, dan
 * membuang detik terakhir tiap hari. Semua rentang di sini setengah-terbuka:
 * `created_at >= start` dan `created_at < end`.
 */

export const WIB_TZ = 'Asia/Jakarta'
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** Tanggal YYYY-MM-DD menurut jam dinding WIB. */
export function wibDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  return new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * Rentang satu hari WIB sebagai ISO UTC.
 * @param {Date|string} date objek Date, atau string 'YYYY-MM-DD' yang sudah WIB
 * @returns {{ day: string, start: string, end: string }}
 */
export function wibDayRange(date = new Date()) {
  const day = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : wibDateString(date)
  const start = new Date(`${day}T00:00:00+07:00`)
  return { day, start: start.toISOString(), end: new Date(start.getTime() + DAY_MS).toISOString() }
}

/** Rentang satu bulan WIB. `month` 1-12. */
export function wibMonthRange(year, month) {
  const y = Number(year)
  const m = Number(month)
  const start = new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00+07:00`)
  const nextY = m === 12 ? y + 1 : y
  const nextM = m === 12 ? 1 : m + 1
  const end = new Date(`${nextY}-${String(nextM).padStart(2, '0')}-01T00:00:00+07:00`)
  return { start: start.toISOString(), end: end.toISOString() }
}

/** Rentang N hari terakhir (termasuk hari ini) menurut WIB. */
export function wibLastDaysRange(days = 7, from = new Date()) {
  const today = wibDayRange(from)
  const start = new Date(new Date(today.start).getTime() - (days - 1) * DAY_MS)
  return { start: start.toISOString(), end: today.end }
}

/** Jam:menit WIB, untuk daftar transaksi. */
export function wibTimeLabel(value) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('id-ID', {
    timeZone: WIB_TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Label tanggal/bulan WIB untuk pengelompokan laporan. Tanpa timeZone,
 *  server (UTC di Vercel) melabeli transaksi 06:30 WIB sebagai hari sebelumnya. */
export function wibLabel(value, options) {
  return new Date(value).toLocaleString('id-ID', { timeZone: WIB_TZ, ...options })
}

/**
 * Rentang untuk filter waktu di dashboard: 'TODAY' | 'THIS_MONTH' | lainnya.
 * null berarti tanpa batas ('ALL_TIME'). Dipakai server DAN diturunkan sebagai
 * prop ke komponen realtime, supaya keduanya tidak lagi menghitung batas hari
 * masing-masing (server UTC vs browser WIB -- temuan C5).
 */
export function wibRangeFor(timeFilter, now = new Date()) {
  if (timeFilter === 'TODAY') {
    const { start, end } = wibDayRange(now)
    return { start, end }
  }
  if (timeFilter === 'THIS_MONTH') {
    const [year, month] = wibDateString(now).split('-')
    return wibMonthRange(year, month)
  }
  return null
}
