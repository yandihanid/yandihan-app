import { SITE_URL } from '@/lib/site'

/**
 * robots.txt. Route Handler khusus, di-cache karena tidak menyentuh API
 * request-time.
 *
 * Yang penting di sini BUKAN mengizinkan crawl halaman publik -- itu default.
 * Yang penting daftar disallow-nya:
 *
 *   /c/    halaman kasir. Path-nya berisi TOKEN kasir. Satu URL yang terindeks
 *          berarti siapa pun yang mencari di Google bisa membuka layar kasir
 *          sebuah toko dan mencatat transaksi ke pembukuannya.
 *   /r/    struk. Isinya nama pembeli, produk, dan nominal. Tautannya memang
 *          dibagikan ke pembeli, tapi "bisa dibagikan" tidak sama dengan
 *          "boleh muncul di hasil pencarian".
 *   /api/  tidak ada gunanya di indeks, dan sebagian jalurnya menerima POST.
 *   /auth/ jalur callback verifikasi email; URL-nya sekali pakai.
 *
 *   /dashboard/ sudah dilindungi proxy.js (redirect ke /login), tapi tetap
 *          dicantumkan supaya crawler tidak membuang waktu dan tidak ada
 *          halaman login yang terindeks dengan ?next=/dashboard/...
 *
 * Catatan: robots.txt adalah permintaan, bukan penjaga. Ia mencegah halaman
 * MUNCUL DI PENCARIAN, bukan mencegah orang membuka URL-nya. Pertahanan
 * sebenarnya untuk /c/ adalah token acak 24 byte + pengikatan perangkat.
 */
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/c/', '/r/', '/api/', '/auth/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
