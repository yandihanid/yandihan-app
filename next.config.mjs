/**
 * Header keamanan. Sebelumnya file ini kosong, jadi aplikasi berjalan tanpa
 * HSTS, tanpa Referrer-Policy, tanpa proteksi framing, dan tanpa CSP --
 * padahal token kasir ada di dalam path URL (/c/<token>) sehingga kebocoran
 * lewat Referer bukan risiko teoretis.
 */

/** Origin Supabase diturunkan dari env supaya connect-src bisa spesifik.
 *  Kalau env belum ada saat build, pakai wildcard *.supabase.co. */
function supabaseOrigins() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw) return ['https://*.supabase.co', 'wss://*.supabase.co']
  try {
    const { host } = new URL(raw)
    return [`https://${host}`, `wss://${host}`]
  } catch {
    return ['https://*.supabase.co', 'wss://*.supabase.co']
  }
}

const isProd = process.env.NODE_ENV === 'production'
const supabase = supabaseOrigins()

// Sandbox DAN produksi keduanya diizinkan: mode aktif ditentukan
// MIDTRANS_IS_PRODUCTION saat runtime, dan CSP ini dibuat saat build.
const MIDTRANS = ['https://app.midtrans.com', 'https://app.sandbox.midtrans.com']
const MIDTRANS_API = ['https://api.midtrans.com', 'https://api.sandbox.midtrans.com']

/**
 * CATATAN JUJUR tentang script-src 'unsafe-inline'.
 *
 * Next menyuntikkan script inline (bootstrap hydration + payload RSC) di setiap
 * halaman. Menghapus 'unsafe-inline' butuh nonce per-request yang dibuat di
 * proxy.js, dan itu memaksa SEMUA halaman jadi dynamic rendering -- termasuk
 * landing page yang seharusnya statis. Jadi untuk sekarang script-src tetap
 * mengizinkan inline.
 *
 * Yang tetap tertutup, dan ini yang penting: connect-src dibatasi ke Supabase
 * dan Midtrans saja. Sesi Supabase disimpan di cookie yang TIDAK httpOnly
 * (Realtime butuh membacanya dari JS -- lihat utils/supabase/cookieOptions.js),
 * jadi jalur yang harus ditutup adalah pengiriman token ke host asing. Script
 * jahat yang berhasil masuk tetap tidak bisa mengirim apa pun ke luar.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${MIDTRANS.join(' ')}`,
  // Tanpa fonts.googleapis.com dan fonts.gstatic.com: font Plus Jakarta Sans
  // sekarang di-self-host oleh next/font (app/layout.js), jadi tidak ada lagi
  // stylesheet maupun file font yang diambil dari domain pihak ketiga.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src 'self' data: blob: ${supabase[0]} https://*.midtrans.com`,
  `connect-src 'self' ${supabase.join(' ')} ${MIDTRANS.join(' ')} ${MIDTRANS_API.join(' ')}`,
  `frame-src 'self' ${MIDTRANS.join(' ')}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Token kasir ada di path URL. strict-origin-when-cross-origin memastikan
  // path itu tidak pernah ikut terkirim ke domain lain.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Permissions-Policy',
    // camera dibiarkan 'self': input bukti pembayaran QRIS memakai
    // capture="environment" di layar kasir.
    value: 'camera=(self), microphone=(), geolocation=(), payment=()',
  },
  { key: 'Content-Security-Policy', value: csp },
]

if (isProd) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  })
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        // Halaman kasir dan struk tidak boleh di-cache CDN: keduanya
        // memuat data spesifik per toko.
        source: '/c/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
    ]
  },
}

export default nextConfig
