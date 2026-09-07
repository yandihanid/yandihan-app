import Link from 'next/link'
import { ArrowRight, Package, ShieldCheck, Users } from 'lucide-react'
import SiteHeader from '@/components/landing/SiteHeader'
import SiteFooter from '@/components/landing/SiteFooter'
import FaqAccordion from '@/components/landing/FaqAccordion'
import PlanCards from '@/components/landing/PlanCards'
import { PRO_PRICE_IDR } from '@/lib/plan'
import { formatRupiah } from '@/lib/format'
import { SITE_NAME } from '@/lib/site'

/**
 * Halaman harga. Halaman ini SUDAH dirujuk dari dalam aplikasi sebelum ada:
 * app/dashboard/pelanggan/page.js:131 mengarahkan pemilik toko paket GRATIS ke
 * /pricing lewat window.location.href, dan sampai sekarang itu berakhir di 404.
 * Jadi ini bukan halaman tambahan, ini tautan rusak yang diperbaiki.
 *
 * Kartunya sama persis dengan yang di landing page (components/landing
 * PlanCards + lib/plans.content.js). Yang khusus di sini hanya penjelasan
 * tambahan: apa arti "1 kasir", bagaimana cara bayar, dan apa yang terjadi
 * kalau langganan habis. Tiga hal itu yang paling sering ditanyakan dan tidak
 * cukup ruang di kartu.
 */
export const metadata = {
  title: 'Harga & Paket',
  description: `Paket GRATIS ${SITE_NAME}: transaksi tanpa batas untuk 1 kasir, selamanya. Paket PRO ${formatRupiah(PRO_PRICE_IDR)}/bulan untuk kasir tanpa batas, program loyalitas, dan laporan lanjutan.`,
  alternates: { canonical: '/pricing' },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: '/pricing',
    siteName: SITE_NAME,
    title: `Harga & Paket | ${SITE_NAME}`,
    description: `Mulai gratis tanpa batas transaksi. PRO ${formatRupiah(PRO_PRICE_IDR)}/bulan.`,
  },
}

const DETAILS = [
  {
    icon: Users,
    tone: 'lp-icon-blue',
    title: 'Apa arti "1 kasir" di paket gratis?',
    desc: 'Satu slot kasir, dan slot itu dihitung sama baik kasir web maupun kasir Telegram. Jadi paket GRATIS boleh punya satu link kasir web ATAU satu kasir bot Telegram, bukan satu-satunya masing-masing. Anda sendiri tetap bisa membuka dashboard dari perangkat mana saja.',
  },
  {
    icon: Package,
    tone: 'lp-icon-green',
    title: 'Kalau langganan PRO habis, data saya hilang?',
    desc: 'Tidak. Transaksi, produk, pelanggan, dan link kasir yang sudah ada tetap utuh dan tetap bisa dipakai. Yang berhenti: diskon loyalitas tidak lagi diterapkan, dan Anda tidak bisa menambah kasir baru selama masih di paket GRATIS. Perpanjang, dan keduanya aktif kembali.',
  },
  {
    icon: ShieldCheck,
    tone: 'lp-icon-purple',
    title: 'Bagaimana cara membayarnya?',
    desc: 'Lewat Midtrans, dari dalam dashboard setelah Anda masuk. Pilihan yang muncul di halaman pembayaran mengikuti metode yang tersedia di sana, seperti transfer bank, QRIS, atau e-wallet. Masa aktif ditambah 30 hari sejak pembayaran dikonfirmasi, dan kalau diperpanjang sebelum habis, sisa harinya tidak hangus melainkan ditambahkan di atasnya.',
  },
]

const BILLING_FAQ = [
  {
    q: 'Apakah ada kontrak atau minimal langganan?',
    a: 'Tidak ada. PRO dibayar per 30 hari dan tidak diperpanjang otomatis, jadi tidak ada tagihan yang datang tanpa Anda minta. Kalau tidak diperpanjang, akun Anda kembali ke paket GRATIS dengan seluruh datanya tetap ada.',
  },
  {
    q: 'Bisa coba PRO dulu sebelum bayar?',
    a: 'Paket GRATIS bukan masa percobaan yang habis, jadi Anda bisa memakai alur kasir, produk, stok, struk, dan laporan omzet selama yang Anda mau tanpa membayar. Yang perlu PRO hanya kasir kedua dan seterusnya, program loyalitas, serta laporan lanjutan.',
  },
  {
    q: 'Pembayaran sudah masuk tapi paket masih GRATIS?',
    a: 'Konfirmasi dari Midtrans biasanya datang dalam beberapa detik dan paket langsung berubah. Kalau Anda menutup jendela pembayaran sebelum konfirmasi masuk, klik tombol "Cek Status Pembayaran" di dashboard: statusnya ditanyakan langsung ke Midtrans, dan kalau sudah lunas masa aktifnya ditambahkan saat itu. Menekannya berkali-kali aman, satu pembayaran tidak bisa dihitung dua kali.',
  },
]

export default function PricingPage() {
  return (
    <div className="lp-page">
      <SiteHeader />

      <main className="lp-main">
        <section className="lp-section" aria-labelledby="pricing-title">
          <div className="lp-inner">
            <div className="lp-section-head">
              <h1 id="pricing-title" className="lp-section-title">
                Harga yang bisa dihitung
              </h1>
              <p className="lp-section-sub">
                Mulai gratis tanpa batas transaksi. Bayar hanya kalau butuh lebih dari satu kasir.
              </p>
            </div>

            {/* headingLevel h2: di halaman ini judulnya h1, jadi nama paket
                naik satu tingkat dibanding di landing page (di sana h3). */}
            <PlanCards headingLevel="h2" />
          </div>
        </section>

        <section className="lp-section lp-section-alt" aria-labelledby="pricing-detail-title">
          <div className="lp-inner">
            <div className="lp-section-head">
              <h2 id="pricing-detail-title" className="lp-section-title">
                Yang perlu diketahui sebelum memilih
              </h2>
            </div>

            <div className="lp-grid">
              {DETAILS.map(({ icon: Icon, tone, title, desc }) => (
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

        <section className="lp-section" aria-labelledby="pricing-faq-title">
          <div className="lp-inner">
            <div className="lp-section-head">
              <h2 id="pricing-faq-title" className="lp-section-title">
                Pertanyaan soal pembayaran
              </h2>
            </div>
            <FaqAccordion items={BILLING_FAQ} />
          </div>
        </section>

        <section className="lp-cta-band" aria-labelledby="pricing-cta-title">
          <div className="lp-inner">
            <h2 id="pricing-cta-title" className="lp-cta-title">
              Mulai dari yang gratis
            </h2>
            <p className="lp-cta-sub">
              Buat akun, catat satu penjualan, lalu putuskan. Tidak ada yang perlu dibatalkan
              kalau ternyata tidak cocok.
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
