/**
 * Pemetaan pesan galat Supabase Auth ke bahasa Indonesia.
 *
 * Kenapa ini perlu: `error.message` dari Supabase ditampilkan mentah di
 * app/login/page.js dan app/signup/page.js, jadi pemilik warung yang salah
 * ketik password membaca "Invalid login credentials" -- kalimat yang tidak
 * memberi tahu apa pun kalau bahasa Inggris bukan bahasa Anda.
 *
 * Yang TIDAK dilakukan di sini: menerjemahkan lebih spesifik dari yang
 * diketahui server. Galat yang tidak dikenal jatuh ke satu pesan umum plus
 * saran tindakan, bukan ke `error.message` mentah -- pesan Inggris yang lolos
 * satu-dua tempat lebih membingungkan daripada pesan umum yang konsisten.
 *
 * Pencocokan pakai `code` lebih dulu (stabil antar versi), lalu jatuh ke
 * pencocokan teks huruf kecil karena Supabase belum mengisi `code` untuk semua
 * galat, dan versi lama tidak mengisinya sama sekali.
 */

/** Kode galat resmi (error.code) -> pesan Indonesia. */
const BY_CODE = {
  invalid_credentials: 'Email atau password salah.',
  email_not_confirmed: 'Email belum diverifikasi. Cek kotak masuk atau folder spam Anda.',
  user_already_exists: 'Email ini sudah terdaftar. Coba masuk.',
  email_exists: 'Email ini sudah terdaftar. Coba masuk.',
  weak_password: 'Password terlalu mudah ditebak. Pakai minimal 6 karakter dengan kombinasi angka.',
  over_request_rate_limit: 'Terlalu banyak percobaan. Tunggu sekitar satu menit, lalu coba lagi.',
  over_email_send_rate_limit:
    'Terlalu banyak email terkirim ke alamat ini. Tunggu beberapa menit sebelum mencoba lagi.',
  same_password: 'Password baru sama dengan password lama. Pakai password yang berbeda.',
  otp_expired: 'Link sudah kedaluwarsa. Minta link baru lalu buka dari email terbaru.',
  validation_failed: 'Data yang dikirim tidak lengkap atau formatnya salah.',
  user_not_found: 'Akun tidak ditemukan.',
  session_not_found: 'Sesi sudah berakhir. Silakan masuk kembali.',
  signup_disabled: 'Pendaftaran akun baru sedang ditutup.',
}

/** Potongan teks error.message (huruf kecil) -> pesan Indonesia. */
const BY_MESSAGE = [
  ['invalid login credentials', BY_CODE.invalid_credentials],
  ['email not confirmed', BY_CODE.email_not_confirmed],
  ['user already registered', BY_CODE.user_already_exists],
  ['already been registered', BY_CODE.user_already_exists],
  ['password should be at least', 'Password minimal 6 karakter.'],
  ['password should contain', BY_CODE.weak_password],
  ['new password should be different', BY_CODE.same_password],
  ['email rate limit exceeded', BY_CODE.over_email_send_rate_limit],
  ['rate limit', BY_CODE.over_request_rate_limit],
  ['too many requests', BY_CODE.over_request_rate_limit],
  ['token has expired', BY_CODE.otp_expired],
  ['expired', BY_CODE.otp_expired],
  ['unable to validate email address', 'Format email tidak valid.'],
  ['invalid email', 'Format email tidak valid.'],
  ['auth session missing', BY_CODE.session_not_found],
  ['signups not allowed', BY_CODE.signup_disabled],
  ['user not found', BY_CODE.user_not_found],
]

/**
 * Kegagalan jaringan sebelum permintaan sampai ke Supabase. Ini bukan galat
 * auth, dan pesannya harus berbeda: menyarankan "periksa email/password" saat
 * yang sebenarnya mati adalah koneksi hanya membuat pengguna mengulang hal
 * yang sama. `fetch` yang gagal melempar TypeError, bukan AuthError.
 */
const NETWORK_MESSAGE =
  'Gagal terhubung ke server. Periksa koneksi internet Anda, lalu coba lagi.'

function isNetworkFailure(err) {
  if (!err) return false
  if (err instanceof TypeError) return true
  const msg = String(err.message || '').toLowerCase()
  return msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')
}

/**
 * Ubah galat apa pun dari Supabase Auth jadi satu kalimat bahasa Indonesia.
 *
 * @param {unknown} err galat dari `{ error }` Supabase atau dari `catch`
 * @param {string} [fallback] pesan kalau galatnya tidak dikenali
 * @returns {string} pesan siap ditampilkan
 */
export function authErrorMessage(err, fallback = 'Terjadi kesalahan. Coba lagi sebentar.') {
  if (!err) return fallback
  if (isNetworkFailure(err)) return NETWORK_MESSAGE

  const code = err.code || err.error_code
  if (code && BY_CODE[code]) return BY_CODE[code]

  const message = String(err.message || '').toLowerCase()
  if (message) {
    for (const [needle, translated] of BY_MESSAGE) {
      if (message.includes(needle)) return translated
    }
  }

  return fallback
}
