import { SITE_URL } from '@/lib/site'

/**
 * sitemap.xml. Hanya halaman publik yang berdiri sendiri.
 *
 * Yang sengaja TIDAK masuk: /dashboard (butuh login), /c/<token> (berisi
 * kredensial kasir), /r/<id> (berisi data pembeli), dan /auth/callback (URL
 * sekali pakai). Lihat app/robots.js.
 *
 * lastModified diisi satu tanggal build yang sama untuk semua entri. Ini
 * halaman statis: `new Date()` dievaluasi saat build (Date bukan API
 * request-time), jadi nilainya ikut berubah setiap kali di-deploy -- yang
 * memang arti "terakhir diubah" untuk halaman seperti ini.
 */
export default function sitemap() {
  const now = new Date()

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
