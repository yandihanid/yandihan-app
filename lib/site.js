/**
 * Identitas situs dalam satu tempat.
 *
 * Nilai-nilai ini sebelumnya tersebar sebagai literal: nama merek ditulis ulang
 * di layout, landing page, dan struk; basis URL di-hardcode ke
 * yandihan-app.vercel.app di webhook Telegram (sudah diperbaiki, lihat
 * siteOrigin() di app/api/telegram/webhook/route.js); dan alamat kontak landing
 * page memakai nomor WhatsApp contoh 6281234567890 yang bukan milik siapa pun.
 *
 * Tidak ada `server-only` di sini secara sengaja -- footer, blok kontak, dan
 * kartu harga adalah komponen yang bisa ikut ke browser, dan semuanya butuh
 * nilai ini. Karena itu semua env yang dibaca di sini harus berawalan
 * NEXT_PUBLIC_ supaya tersedia di kedua sisi.
 */

export const SITE_NAME = 'Yandihan Kasir'

export const SITE_TAGLINE = 'Kasir & Laporan Keuangan untuk UMKM'

export const SITE_DESCRIPTION =
  'Aplikasi kasir online untuk UMKM Indonesia: catat penjualan dari HP atau ' +
  'Telegram, stok berkurang otomatis, struk digital, dan laporan keuangan ' +
  'harian yang bisa dibaca tanpa belajar akuntansi.'

/**
 * Basis URL publik tanpa garis miring di akhir.
 *
 * Urutan yang sama dengan siteOrigin() di webhook Telegram, dengan satu
 * perbedaan: di sini VERCEL_URL tidak bisa dipakai karena tidak ikut ke bundle
 * browser. Vercel menyediakan NEXT_PUBLIC_VERCEL_URL untuk keperluan itu.
 *
 * Fallback terakhir localhost hanya relevan saat pengembangan; di produksi
 * `metadataBase` yang salah membuat OpenGraph memakai URL relatif dan preview
 * link di WhatsApp/Telegram jadi kosong -- jadi NEXT_PUBLIC_SITE_URL sebaiknya
 * selalu diisi saat deploy.
 */
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`
  return 'http://localhost:3000'
}

export const SITE_URL = resolveSiteUrl()

/**
 * Alamat email dukungan.
 *
 * Nilai ini BUKAN karangan: alamat yang sama sudah dikirim ke pengguna sejak
 * commit 353fe75 sebagai link "Hubungi Kami" di footer landing page, dan
 * domainnya sama dengan domain aplikasi. Yang berubah di sini hanya tempatnya --
 * dari literal yang tersebar jadi satu konstanta.
 *
 * Kalau alamat ini TIDAK aktif, ganti jadi null: pemanggil memperlakukan null
 * sebagai "jangan render tombol kontak sama sekali". Tombol kontak yang
 * mengirim pesan pelanggan ke alamat mati lebih buruk daripada tidak ada
 * tombol kontak, karena pengirimnya merasa sudah menghubungi kita.
 */
export const SUPPORT_EMAIL = 'support@yandihan.my.id'

/** URL `mailto:` lengkap dengan subjek terisi, atau null kalau alamatnya
 *  belum ditentukan. Pemanggil memakai null sebagai sinyal "jangan render". */
export function supportMailto(subject = `Bantuan ${SITE_NAME}`) {
  if (!SUPPORT_EMAIL) return null
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
}

/**
 * Tautan sosial yang benar-benar dirender di footer.
 *
 * Keduanya masuk repo pada commit e610897 yang sama, dan salah satunya --
 * `https://wa.me/6281234567890` -- adalah nomor contoh, bukan nomor siapa pun.
 * Nomor itu dihapus. Handle Instagram-nya cocok dengan nama merek jadi
 * dipertahankan (link Instagram yang salah hanya berujung di halaman "akun
 * tidak ditemukan", tidak menelan pesan pelanggan seperti WhatsApp/email mati),
 * tapi saya juga TIDAK bisa memverifikasi bahwa akunnya ada.
 *
 * Kalau akun itu tidak ada: set `instagram: null`. Footer melewati setiap entri
 * yang bernilai null, jadi tidak ada ikon yang menggantung.
 */
export const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/yandihan',
}

/** Warna tema untuk <meta name="theme-color">. Harus sama dengan
 *  theme_color di public/manifest.json, kalau tidak bilah alamat browser dan
 *  splash screen PWA berbeda warna. */
export const THEME_COLOR = '#0F172A'
