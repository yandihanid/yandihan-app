import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Receipt,
  Send,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  WifiOff,
  Zap,
} from 'lucide-react'
import SiteHeader from '@/components/landing/SiteHeader'
import SiteFooter from '@/components/landing/SiteFooter'
import FaqAccordion from '@/components/landing/FaqAccordion'
import PlanCards from '@/components/landing/PlanCards'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/site'

/**
 * Landing page. SERVER COMPONENT -- dan itu perubahan terpenting di file ini.
 *
 * Versi sebelumnya diawali "use client". Alasannya hanya tiga, dan tidak satu
 * pun soal data:
 *
 *   1. ~40 handler onMouseEnter/onMouseLeave inline yang menulis transform dan
 *      boxShadow langsung ke elemen. Itu pekerjaan :hover; sekarang ada di
 *      globals.css sebagai .lp-lift dan tetangganya.
 *   2. dua pasang useState untuk menu mobile dan akordeon FAQ. Keduanya pindah
 *      ke island kecil (components/landing/MobileNav.js dan FaqAccordion.js).
 *   3. satu IntersectionObserver yang memanggil setVisibleSections pada setiap
 *      perpotongan -- dan visibleSections TIDAK PERNAH DIBACA di mana pun.
 *      Observer, ref, state, dan seluruh atribut data-animate hanya membuat
 *      pohon 997 baris ini render ulang berkali-kali tanpa hasil. Semuanya
 *      dihapus.
 *
 * Akibat dari "use client" itu: export const metadata MUSTAHIL (metadata hanya
 * boleh diekspor Server Component), jadi landing page tidak punya OpenGraph,
 * Twitter card, maupun canonical sama sekali. Untuk produk yang dibagikan lewat
 * WhatsApp dan Telegram, itu berarti setiap tautan yang dibagikan tampil sebagai
 * teks polos tanpa gambar maupun judul.
 *
 * KEJUJURAN ISI. Beberapa klaim di versi lama tidak cocok dengan kodenya:
 *   * "#1" pada badge hero -- tidak ada dasarnya, dihapus.
 *   * "notifikasi omzet harian ... langsung di Telegram" -- bot hanya MENERIMA
 *     laporan; tidak ada pengirim notifikasi di repo ini. Diberi label "segera"
 *     dan dipindahkan dari janji jadi rencana.
 *   * "Ribuan UMKM sudah merasakan manfaat Yandihan" beserta tiga testimoni yang
 *     ditandai sendiri "Dummy testimoni" -- lengkap dengan nama orang dan kota.
 *     Testimoni karangan dengan nama orang bukan soal selera, itu risiko hukum.
 *     Seluruh bagiannya dihapus, bukan diganti dengan testimoni lain.
 *   * Tombol "Unduh APK Kasir" -- berkas .apk itu dikeluarkan dari repositori
 *     (lihat Tahap 6), jadi tautannya akan 404 begitu di-deploy. Diganti tautan
 *     ke /guide, dan cara memasang ke home screen dijelaskan di FAQ. Halaman
 *     kasirnya memang PWA (public/manifest.json + sw.js), jadi itu bukan
 *     pengganti seadanya.
 */
export const metadata = {
  // absolute melewati template "%s | Yandihan Kasir" dari app/layout.js --
  // untuk halaman utama, nama merek dua kali hanya memakan lebar di hasil
  // pencarian.
  title: { absolute: SITE_NAME + ' - ' + SITE_TAGLINE },
  description: SITE_DESCRIPTION,
  keywords: [
    'aplikasi kasir online',
    'kasir UMKM',
    'POS Indonesia',
    'laporan keuangan warung',
    'aplikasi kasir gratis',
    'struk digital',
    'kasir Telegram',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: '/',
    siteName: SITE_NAME,
    title: SITE_NAME + ' - ' + SITE_TAGLINE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME + ' - ' + SITE_TAGLINE,
    description: SITE_DESCRIPTION,
  },
}

const STEPS = [
  {
    icon: Smartphone,
    tone: 'lp-icon-blue',
    step: 'Langkah 1',
    title: 'Bagikan link kasir',
    desc: 'Tambahkan kasir di dashboard, lalu kirim URL-nya lewat WhatsApp. Kasir membuka link itu di browser HP-nya: tanpa memasang aplikasi, tanpa membuat akun.',
  },
  {
    icon: Receipt,
    tone: 'lp-icon-green',
    step: 'Langkah 2',
    title: 'Kasir mencatat penjualan',
    desc: 'Pilih produk, isi jumlah, pilih tunai atau QRIS. Harga dan total dihitung server dari daftar produk Anda, jadi tidak ada angka yang bisa diketik sembarangan.',
  },
  {
    icon: BarChart3,
    tone: 'lp-icon-purple',
    step: 'Langkah 3',
    title: 'Anda lihat hasilnya',
    desc: 'Transaksi muncul di dashboard saat itu juga, stok berkurang otomatis, dan struk digitalnya siap dibagikan atau dicetak.',
  },
]

const FEATURES = [
  {
    icon: Smartphone,
    tone: 'lp-icon-blue',
    title: 'Tanpa pasang aplikasi',
    desc: 'Kasir hanya butuh satu tautan. Bisa dibuka dari HP apa pun, dan kalau mau, disimpan ke layar utama supaya membuka seperti aplikasi.',
  },
  {
    icon: WifiOff,
    tone: 'lp-icon-amber',
    title: 'Tetap jalan saat internet mati',
    desc: 'Transaksi yang gagal terkirim disimpan di HP kasir, termasuk foto bukti transfernya, lalu dikirim otomatis begitu sinyal kembali.',
  },
  {
    icon: Zap,
    tone: 'lp-icon-green',
    title: 'Dashboard yang bergerak sendiri',
    desc: 'Setiap penjualan yang masuk langsung muncul di dashboard Anda tanpa perlu memuat ulang halaman. Tidak perlu menunggu toko tutup untuk tahu omzet hari ini.',
  },
  {
    icon: Receipt,
    tone: 'lp-icon-purple',
    title: 'Struk digital siap cetak',
    desc: 'Setiap transaksi menghasilkan satu tautan struk berisi rincian item, diskon, dan kembalian. Rapi di layar, rapi juga di printer thermal 58 mm dan 80 mm.',
  },
  {
    icon: ShieldCheck,
    tone: 'lp-icon-blue',
    title: 'Link kasir terikat satu perangkat',
    desc: 'Begitu link dibuka di HP kasir, perangkat lain yang memakai link yang sama ditolak. Tautan yang tersebar di grup chat tidak otomatis jadi pintu masuk.',
  },
  {
    icon: Send,
    tone: 'lp-icon-green',
    title: 'Bisa lapor dari Telegram',
    desc: 'Kasir yang lebih nyaman dengan chat bisa mengirim laporan ke bot. Harga tetap diambil dari daftar produk dan stok tetap berkurang: aturannya sama dengan jalur web.',
  },
]

/**
 * FAQ. Setiap jawaban di bawah ini saya cocokkan dulu ke kode yang
 * menegakkannya -- daftar sebelumnya menjanjikan APK Android (berkasnya keluar
 * dari repo) dan menjual Device Binding sebagai fitur PRO (sebenarnya aktif di
 * semua paket, app/api/cashier/route.js:55-75, tanpa pemeriksaan tier).
 *
 * Yang SENGAJA belum disebut: memutar/mencabut token kasir. Fungsinya sudah ada
 * (app/dashboard/settings/actions.js rotateCashierToken) tapi belum ada tombol
 * yang memanggilnya, jadi menyebutnya sekarang berarti menyuruh pemilik toko
 * mencari menu yang belum ada. Masuk FAQ setelah Tahap 4.
 */
const FAQ_ITEMS = [
  {
    q: 'Apakah paket gratisnya benar-benar gratis?',
    a: 'Ya, dan berlaku selamanya. Tidak ada masa percobaan yang habis dan tidak perlu kartu kredit. Jumlah transaksinya tidak dibatasi; batasnya hanya satu kasir. Kalau nanti butuh lebih dari satu kasir, program loyalitas pelanggan, atau laporan lanjutan, baru pindah ke PRO.',
  },
  {
    q: 'Bagaimana cara mendapatkan link kasir?',
    a: 'Setelah mendaftar, buat toko Anda, lalu tambahkan kasir di menu Pengaturan. Setiap kasir mendapat satu URL sendiri yang bisa Anda kirim lewat WhatsApp atau Telegram. Kasir cukup membuka link itu: tidak ada aplikasi yang perlu dipasang dan tidak ada akun yang perlu ia buat.',
  },
  {
    q: 'Kasir saya harus memasang aplikasi?',
    a: 'Tidak. Halaman kasir berjalan di browser HP apa pun. Kalau kasir ingin tampilannya seperti aplikasi, buka link kasirnya lalu pilih "Tambahkan ke layar utama" di menu browser. Halamannya akan punya ikon sendiri dan terbuka tanpa bilah alamat.',
  },
  {
    q: 'Bagaimana kalau internet mati saat sedang jualan?',
    a: 'Transaksinya tidak hilang. Yang gagal terkirim disimpan dulu di HP kasir, termasuk foto bukti transfernya, dan dikirim otomatis begitu sinyal kembali. Kasir bisa terus melayani pembeli sementara itu.',
  },
  {
    q: 'Bisa mencatat penjualan lewat Telegram?',
    a: 'Bisa. Hubungkan bot ke toko Anda dengan mengirim /start diikuti kode toko, lalu laporkan penjualan dengan mengetik jumlah dan nama produknya. Harganya diambil dari daftar produk Anda, stok tetap berkurang, dan struknya tetap dibuat: persis seperti jalur web. Satu catatan jujur, saat ini botnya menerima laporan dan belum mengirim ringkasan omzet.',
  },
  {
    q: 'Seaman apa data penjualan saya?',
    a: 'Data setiap toko dipisahkan di tingkat database, bukan hanya disembunyikan di tampilan, jadi akun lain tidak bisa membaca transaksi Anda meski menebak-nebak alamatnya. Setiap link kasir juga terikat ke satu perangkat, sehingga tautan yang tersebar tidak otomatis bisa dipakai orang lain.',
  },
]

export default function Home() {
  return (
    <div className="lp-page">
      <SiteHeader />

      <main className="lp-main">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="lp-hero">
          {/* Dua bulatan blur dekoratif. aria-hidden karena tidak membawa
              informasi, dan pointer-events:none di CSS supaya tidak pernah
              menutupi tombol di atasnya. */}
          <div className="lp-blob lp-blob-a" aria-hidden="true" />
          <div className="lp-blob lp-blob-b" aria-hidden="true" />

          <div className="lp-hero-inner">
            <div className="lp-hero-copy">
              <span className="lp-badge">
                <span className="lp-badge-dot" aria-hidden="true" />
                Gratis selamanya untuk 1 kasir
              </span>

              <h1 className="lp-hero-title">
                Operasional toko rapi,
                <span className="lp-hero-accent"> tanpa catatan yang tercecer.</span>
              </h1>

              <p className="lp-hero-sub">
                Kasir mencatat penjualan dari HP lewat satu tautan. Anda memantau omzet, stok,
                antrean, dan struk digital dari dashboard yang sama—secara realtime.
              </p>

              <div className="lp-hero-cta">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Mulai Gratis Sekarang
                  <ArrowRight size={20} aria-hidden="true" />
                </Link>
                <Link href="/guide" className="btn btn-secondary btn-lg">
                  Lihat Cara Kerjanya
                </Link>
              </div>

              <div className="lp-hero-proof" aria-label="Keunggulan utama">
                <span><CheckCircle2 size={17} aria-hidden="true" /> Tanpa kartu kredit</span>
                <span><CheckCircle2 size={17} aria-hidden="true" /> Tanpa instalasi</span>
                <span><CheckCircle2 size={17} aria-hidden="true" /> Tetap jalan saat offline</span>
              </div>
            </div>

            <div className="lp-product-showcase" aria-label="Ilustrasi dashboard Yandihan">
              <div className="lp-showcase-glow" aria-hidden="true" />
              <div className="lp-dashboard-mockup">
                <div className="lp-mockup-topbar">
                  <div className="lp-mockup-brand">
                    <span className="lp-logo-mark" aria-hidden="true">Y</span>
                    <span>Dashboard Toko</span>
                  </div>
                  <span className="lp-live-pill"><span aria-hidden="true" /> Realtime</span>
                </div>

                <div className="lp-mockup-content">
                  <div className="lp-mockup-stats">
                    <div className="lp-mockup-stat lp-mockup-stat-primary">
                      <span>Omzet hari ini</span>
                      <strong>Rp 1.842.000</strong>
                      <small><TrendingUp size={14} aria-hidden="true" /> 18 transaksi masuk</small>
                    </div>
                    <div className="lp-mockup-stat">
                      <span>Antrean aktif</span>
                      <strong>04</strong>
                      <small><Clock3 size={14} aria-hidden="true" /> Terpantau langsung</small>
                    </div>
                  </div>

                  <div className="lp-mockup-panel">
                    <div className="lp-mockup-panel-head">
                      <div>
                        <strong>Transaksi terbaru</strong>
                        <span>Masuk otomatis dari kasir</span>
                      </div>
                      <span>Lihat semua</span>
                    </div>
                    <div className="lp-mockup-rows">
                      <div className="lp-mockup-row">
                        <span className="lp-mockup-icon lp-icon-green"><Receipt size={17} /></span>
                        <span><strong>Nasi Goreng + Es Teh</strong><small>Kasir Utama · baru saja</small></span>
                        <strong>Rp 28.000</strong>
                      </div>
                      <div className="lp-mockup-row">
                        <span className="lp-mockup-icon lp-icon-blue"><PackageCheck size={17} /></span>
                        <span><strong>Stok diperbarui</strong><small>Otomatis setelah transaksi</small></span>
                        <span className="lp-mockup-status">Selesai</span>
                      </div>
                      <div className="lp-mockup-row">
                        <span className="lp-mockup-icon lp-icon-purple"><BarChart3 size={17} /></span>
                        <span><strong>Laporan hari ini</strong><small>Siap dibaca pemilik toko</small></span>
                        <strong>+12%</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="lp-preview-note">Tampilan dan angka di atas merupakan ilustrasi produk.</p>
            </div>
          </div>
        </section>

        <section className="lp-value-strip" aria-label="Manfaat Yandihan">
          <div className="lp-inner lp-value-grid">
            <div><strong>1 tautan</strong><span>untuk mulai mencatat dari HP kasir</span></div>
            <div><strong>Realtime</strong><span>omzet dan stok masuk ke dashboard</span></div>
            <div><strong>Offline-ready</strong><span>transaksi tersimpan saat sinyal putus</span></div>
          </div>
        </section>

        {/* ── Cara kerja ─────────────────────────────────────────────────── */}
        <section id="cara-kerja" className="lp-section" aria-labelledby="lp-steps-title">
          <div className="lp-inner">
            <div className="lp-section-head">
              <h2 id="lp-steps-title" className="lp-section-title">
                Tiga langkah, selesai hari ini
              </h2>
              <p className="lp-section-sub">
                Tidak ada pemasangan, tidak ada pelatihan. Kasir Anda cukup bisa membuka tautan.
              </p>
            </div>

            <div className="lp-grid">
              {STEPS.map(({ icon: Icon, tone, step, title, desc }) => (
                <article key={title} className="lp-tile lp-tile-center lp-lift">
                  <span className={`lp-icon lp-icon-lg ${tone}`} aria-hidden="true">
                    <Icon size={28} />
                  </span>
                  <p className="lp-tile-step">{step}</p>
                  <h3 className="lp-tile-title">{title}</h3>
                  <p className="lp-tile-desc">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Fitur ──────────────────────────────────────────────────────── */}
        <section id="fitur" className="lp-section lp-section-alt" aria-labelledby="lp-features-title">
          <div className="lp-inner">
            <div className="lp-section-head">
              <h2 id="lp-features-title" className="lp-section-title">
                Dibuat untuk warung, bukan untuk kantor
              </h2>
              <p className="lp-section-sub">
                Setiap fitur di bawah ini sudah jalan sekarang, bukan rencana.
              </p>
            </div>

            <div className="lp-grid lp-grid-wide">
              {FEATURES.map(({ icon: Icon, tone, title, desc }) => (
                <article key={title} className="lp-tile lp-lift">
                  <span className={`lp-icon ${tone}`} aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  <h3 className="lp-tile-title">{title}</h3>
                  <p className="lp-tile-desc">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Harga ──────────────────────────────────────────────────────── */}
        {/* Kartunya datang dari components/landing/PlanCards.js dan isinya dari
            lib/plans.content.js -- daftar yang sama dipakai /pricing. Sebelum
            ini landing page memegang daftar fiturnya sendiri, dan begitu
            /pricing ada akan jadi dua daftar yang pasti berpisah. */}
        <section id="harga" className="lp-section" aria-labelledby="lp-pricing-title">
          <div className="lp-inner">
            <div className="lp-section-head">
              <h2 id="lp-pricing-title" className="lp-section-title">
                Harga yang bisa dihitung
              </h2>
              <p className="lp-section-sub">
                Mulai gratis tanpa batas transaksi. Bayar hanya kalau butuh lebih dari satu kasir.
              </p>
            </div>

            <PlanCards />
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────────── */}
        <section id="faq" className="lp-section lp-section-alt" aria-labelledby="lp-faq-title">
          <div className="lp-inner">
            <div className="lp-section-head">
              <h2 id="lp-faq-title" className="lp-section-title">
                Pertanyaan yang sering masuk
              </h2>
            </div>

            {/* Island kecil: hanya bagian buka-tutupnya yang butuh JavaScript.
                Teks jawabannya tetap ikut ke HTML awal, jadi tetap terbaca
                mesin pencari walau panelnya tertutup. */}
            <FaqAccordion items={FAQ_ITEMS} />
          </div>
        </section>

        {/* ── Penutup ────────────────────────────────────────────────────── */}
        {/* Bagian baru. Halaman sebelumnya berakhir di kartu harga lalu langsung
            footer, jadi pengunjung yang membaca sampai bawah tidak diberi satu
            pun jalan untuk mulai. */}
        <section className="lp-cta-band" aria-labelledby="lp-cta-title">
          <div className="lp-inner">
            <h2 id="lp-cta-title" className="lp-cta-title">
              Coba dengan penjualan Anda hari ini
            </h2>
            <p className="lp-cta-sub">
              Buat akun, tambahkan satu produk, lalu kirim link kasirnya ke HP Anda sendiri.
              Lima menit cukup untuk tahu apakah ini cocok.
            </p>
            <Link href="/signup" className="btn btn-primary btn-lg">
              Buat Akun Gratis
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
