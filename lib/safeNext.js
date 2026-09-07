/**
 * Validasi tujuan redirect `?next=`.
 *
 * Kenapa file ini ada: proxy.js menyimpan tujuan asal ke `?next=` supaya klik
 * link ke /dashboard/laporan sambil logout tidak berakhir di Ringkasan. Tapi
 * nilai itu datang dari URL, artinya penyerang boleh menentukannya. Kalau
 * halaman login menuruti apa saja, halaman login sendiri jadi open redirect:
 *
 *   /login?next=https://phising.example/login-palsu
 *
 * Korban membuka domain kita, melihat halaman login kita, lalu dikirim ke
 * halaman tiruan setelah masuk. Memperbaiki UX tidak boleh membuka lubang itu.
 *
 * Yang diterima HANYA path relatif dalam aplikasi ini:
 *   - harus dimulai satu '/'                  -> menolak 'https://...' dan 'javascript:...'
 *   - tidak boleh '//' atau '/\' di awal      -> '//evil.com' adalah URL protocol-relative
 *   - tidak boleh mengandung karakter kendali -> newline bisa lolos parser yang longgar
 *   - tidak boleh kembali ke halaman auth     -> mencegah loop /login -> /login
 */

const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/']

export const DEFAULT_NEXT = '/dashboard'

/**
 * Benar kalau `value` memuat karakter kendali C0, spasi, atau DEL.
 *
 * Diperiksa lewat charCodeAt, bukan regex: kelas karakter yang memuat karakter
 * kendali literal tidak terlihat saat di-review (dan memicu aturan ESLint
 * `no-control-regex`), sementara versi escape-nya mudah salah ketik tanpa ada
 * yang menyadarinya.
 */
function hasControlChars(value) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code <= 0x20 || code === 0x7f) return true
  }
  return false
}

/**
 * @param {unknown} value nilai mentah `next` dari query string
 * @param {string} [fallback] dipakai kalau `value` tidak lolos
 * @returns {string} path relatif yang aman dipakai untuk redirect
 */
export function safeNextPath(value, fallback = DEFAULT_NEXT) {
  if (typeof value !== 'string' || value.length === 0) return fallback
  if (value.length > 512) return fallback

  // Karakter kendali dibuang lebih dulu: beberapa parser URL memangkasnya
  // diam-diam, jadi newline + 'https://evil.com' bisa berakhir sebagai URL
  // absolut di satu tempat dan path relatif di tempat lain.
  if (hasControlChars(value)) return fallback

  if (!value.startsWith('/')) return fallback
  // '//host' dan '/\host' keduanya diperlakukan browser sebagai URL absolut.
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback

  const pathOnly = value.split(/[?#]/)[0]
  if (AUTH_PATHS.some((p) => pathOnly === p || pathOnly.startsWith(p))) return fallback

  return value
}
