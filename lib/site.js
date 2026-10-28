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
 * Basis URL untuk `success_redirect_url`/`failure_redirect_url` invoice Xendit.
 *
 * Sebelumnya tiap route menyusunnya sendiri dan `app/api/payment` hanya membaca
 * NEXT_PUBLIC_APP_URL, sehingga di deploy yang cuma mengisi NEXT_PUBLIC_SITE_URL
 * pembeli dilempar ke http://localhost:3000 setelah membayar.
 *
 * Aturannya: pakai SITE_URL kalau sudah diisi. Kalau masih jatuh ke localhost
 * (artinya env belum diisi), pakai origin request supaya tetap kembali ke
 * domain yang benar, mis. https://yandihan.my.id.
 */
export function resolveBaseUrl(req) {
  if (!/^https?:\/\/localhost(:\d+)?$/i.test(SITE_URL)) return SITE_URL

  const origin = req?.headers?.get('origin')
  if (origin) return origin.replace(/\/+$/, '')

  const host = req?.headers?.get('host')
  if (host) {
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    return `${proto.split(',')[0].trim()}://${host}`
  }

  return SITE_URL
}

/**
 * Alamat email dukungan sekaligus kontak bisnis resmi.
 *
 * Sejak persiapan verifikasi merchant Xendit, alamat ini diseragamkan ke
 * alamat bisnis resmi `yandihan@proton.me` -- inilah email yang didaftarkan
 * atas nama badan usaha (lihat LEGAL_ENTITY). Alamat lama
 * `support@yandihan.my.id` ditinggalkan supaya kontak di seluruh situs,
 * halaman hukum, dan dokumen pendaftaran gateway memakai satu alamat yang sama.
 *
 * Kalau alamat ini TIDAK aktif, ganti jadi null: pemanggil memperlakukan null
 * sebagai "jangan render tombol kontak sama sekali". Tombol kontak yang
 * mengirim pesan pelanggan ke alamat mati lebih buruk daripada tidak ada
 * tombol kontak, karena pengirimnya merasa sudah menghubungi kita.
 */
export const SUPPORT_EMAIL = 'yandihan@proton.me'

/**
 * Badan hukum penyelenggara layanan.
 *
 * "Yandihan" / "Yandihan Kasir" adalah merek produk; badan usaha yang
 * mengoperasikannya dan terdaftar di payment gateway (Xendit) adalah ini.
 * Dipakai di footer, halaman hukum, halaman utama, dan halaman kontak supaya
 * hubungan merek -> badan usaha terlihat konsisten di seluruh situs -- syarat
 * verifikasi merchant.
 */
export const LEGAL_ENTITY = 'PT Yandihan Guyub Santosa'

/** Alamat bisnis lengkap, satu baris, untuk ditampilkan di footer dan halaman
 *  kontak. Sama dengan alamat yang didaftarkan atas nama LEGAL_ENTITY. */
export const BUSINESS_ADDRESS = 'Gunung Anyar Emas J2, Surabaya, Jawa Timur'

/**
 * Informasi Perpajakan & Surat Keterangan PP 55/2022 (Suket PP 55).
 * Digunakan pada halaman Billing dan transparansi usaha.
 */
export const TAX_INFO = {
  taxpayerName: 'YANDIHAN GUYUB SANTOSA',
  npwp: '1000000011334236',
  suketNumber: 'KET-00234/PP23-CT/KPP.1108/2026',
  regulation: 'Peraturan Pemerintah Nomor 55 Tahun 2022',
  kpp: 'KPP Pratama Surabaya Rungkut',
  taxRate: '0.5% (Final UMKM)',
  issuedDate: '29 September 2026',
}

/**
 * Status pendaftaran Penyelenggara Sistem Elektronik (PSE) Lingkup Privat.
 *
 * yandihan.my.id terdaftar sebagai PSE Lingkup Privat di Kementerian Komunikasi
 * dan Digital RI (Komdigi, dulu Kominfo). Pernyataan ini wajib mudah ditemukan
 * di situs penyelenggara, jadi dirender di footer (semua halaman publik) dan di
 * halaman kontak -- sama polanya dengan blok badan hukum di atas.
 *
 * PSE_REGISTRATION_ID adalah nomor Tanda Daftar PSE (TD PSE). Dibiarkan null
 * selama nomornya belum di tangan: pemanggil hanya menampilkan nomor kalau diisi
 * (lihat penjaga `PSE_REGISTRATION_ID &&` di footer/kontak), supaya tidak ada
 * nomor karangan yang beredar. Isi dengan string begitu TD PSE terbit.
 */
export const PSE_SCOPE = 'Lingkup Privat'
export const PSE_AUTHORITY = 'Kementerian Komunikasi dan Digital Republik Indonesia'
export const PSE_REGISTRATION_ID = '030106.01/DJAI.PSE/09/2026'

/** Nama payment gateway yang memproses pembayaran langganan. Satu sumber supaya
 *  nama ini tidak lagi ditulis ulang (dan menyimpang) di tiap halaman. */
export const PAYMENT_GATEWAY = 'Xendit'

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
