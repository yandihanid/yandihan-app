/**
 * Isi kartu harga: SATU daftar, dibaca landing page dan /pricing.
 *
 * Kenapa dipisah dari komponennya: sebelum ini landing page memegang dua daftar
 * fitur yang ditulis tangan, dan begitu /pricing ditambahkan akan ada daftar
 * ketiga. Daftar yang diduplikasi selalu berpisah -- itu yang sudah terjadi
 * dengan harga PRO, yang sempat punya empat nilai berbeda di empat file.
 *
 * ATURAN ISI FILE INI: setiap baris harus bisa ditunjuk ke kode yang
 * menegakkannya. Referensinya saya tulis di komentar masing-masing supaya
 * pemeriksaan berikutnya tidak perlu menebak. Fitur yang belum ada BOLEH
 * disebut, tapi wajib `soon: true` -- itu batas antara roadmap dan janji palsu.
 *
 * Yang DIHAPUS dari daftar lama beserta alasannya:
 *   * "Transaksi Tanpa Batas" sebagai pembeda PRO -- GRATIS sekarang juga tanpa
 *     batas, jadi menjualnya sebagai fitur PRO adalah harga tanpa isi.
 *   * "Fitur Device Binding (Anti-Copas Link)" sebagai PRO-only -- pengikatan
 *     perangkat aktif di semua paket (app/api/cashier/route.js:61-69, tanpa
 *     pemeriksaan tier sama sekali). Sekarang disebut di paket GRATIS.
 *   * "1 Web Kasir & 1 Akun Telegram Bot" -- salah. PLAN_LIMITS.FREE.maxCashiers
 *     adalah 1 dan menghitung kasir web DAN Telegram dalam kuota yang sama
 *     (app/dashboard/settings/actions.js:35, app/api/telegram/webhook:294).
 *     Yang benar: satu kasir, bebas mau web atau Telegram.
 *   * "Analitik Lanjutan & Prioritas Support" -- dipecah. Laporan lanjutan jadi
 *     baris tersendiri bertanda `soon`; janji prioritas support dihapus karena
 *     itu komitmen operasional pemilik, bukan sesuatu yang ada di kode.
 */

export const FREE_FEATURES = [
  // Batas 30 transaksi/hari sudah dihapus dari jalur web dan Telegram.
  { label: 'Transaksi tanpa batas, selamanya' },
  // PLAN_LIMITS.FREE.maxCashiers = 1, dihitung gabungan web + Telegram.
  { label: '1 kasir — boleh lewat web atau bot Telegram' },
  // app/dashboard/laporan/page.js terbuka untuk semua paket.
  { label: 'Laporan omzet harian & bulanan' },
  // app/dashboard/produk + pengurangan stok atomik di submit_transaction().
  { label: 'Kelola produk, stok berkurang otomatis' },
  // app/r/[id] + tombol cetak, tanpa gerbang paket.
  { label: 'Struk digital yang bisa dibagikan & dicetak' },
  // app/api/cashier/route.js:61-69 -- aktif di semua paket.
  { label: 'Link kasir terikat satu perangkat (anti-copas)' },
]

export const PRO_FEATURES = [
  // PLAN_LIMITS.PRO.maxCashiers = Infinity.
  { label: 'Kasir tanpa batas — web maupun Telegram', strong: true },
  // lib/loyalty.js:29 -- loyaltyEnabled() mensyaratkan isPro(store).
  { label: 'Program loyalitas: diskon otomatis untuk pelanggan setia', strong: true },
  // Daftar tunggu + nama pembeli wajib: setelan toko, terbuka semua paket,
  // jadi TIDAK dijual sebagai fitur PRO. Sengaja tidak ada di daftar ini.
  //
  // Laporan lanjutan (produk terlaris, performa kasir, kas vs QRIS, tren
  // harian) belum ada gerbangnya di kode -- ditandai SEGERA sampai
  // supabase/migrations/0005_report_rpcs.sql dan halaman laporannya terpasang.
  { label: 'Laporan lanjutan: produk terlaris, performa kasir, tren harian', soon: true },
  { label: 'Semua fitur paket GRATIS' },
]
