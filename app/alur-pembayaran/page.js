import Link from 'next/link'
import { ArrowRight, Package, Receipt, ShieldCheck, CheckCircle2 } from 'lucide-react'
import SiteHeader from '@/components/landing/SiteHeader'
import SiteFooter from '@/components/landing/SiteFooter'
import { PRO_PRICE_IDR } from '@/lib/plan'
import { formatRupiah } from '@/lib/format'
import { SITE_NAME, PAYMENT_GATEWAY } from '@/lib/site'

/**
 * Alur Pembayaran / Payment Flow.
 *
 * Halaman ini ada untuk verifikasi merchant: payment gateway meminta alur
 * pembayaran yang bisa diakses publik, dari memilih layanan sampai halaman
 * sukses. Langkah-langkah di bawah mengikuti alur langganan PRO yang nyata
 * (pilih paket -> checkout di dashboard -> bayar lewat gateway -> konfirmasi),
 * dan nominalnya dibaca dari PRO_PRICE_IDR supaya tidak menyimpang dari yang
 * benar-benar ditagih.
 */
export const metadata = {
  title: 'Alur Pembayaran',
  description: `Langkah pembayaran langganan ${SITE_NAME}: memilih paket, checkout, memilih metode pembayaran lewat ${PAYMENT_GATEWAY}, hingga konfirmasi pembayaran berhasil.`,
  alternates: { canonical: '/alur-pembayaran' },
  openGraph: {
    type: 'article',
    locale: 'id_ID',
    url: '/alur-pembayaran',
    siteName: SITE_NAME,
    title: `Alur Pembayaran | ${SITE_NAME}`,
    description: `Cara membayar langganan ${SITE_NAME} lewat ${PAYMENT_GATEWAY}, langkah demi langkah.`,
  },
}

const STEPS = [
  {
    icon: Package,
    tone: 'lp-icon-blue',
    step: 'Langkah 1',
    title: 'Pilih produk / layanan',
    desc: `Pilih paket yang Anda butuhkan. Paket GRATIS bisa dipakai selamanya; paket PRO berbiaya ${formatRupiah(PRO_PRICE_IDR)} per bulan untuk kasir tanpa batas, program loyalitas, dan laporan lanjutan. Rinciannya ada di halaman Harga.`,
  },
  {
    icon: Receipt,
    tone: 'lp-icon-green',
    step: 'Langkah 2',
    title: 'Masuk ke checkout',
    desc: 'Masuk ke akun Anda, lalu tekan "Beli Paket PRO" di dashboard. Sistem membuat satu pesanan dengan nomor order unik dan menghitung total pembayaran di server, jadi nominal tidak bisa diubah dari sisi perangkat.',
  },
  {
    icon: ShieldCheck,
    tone: 'lp-icon-purple',
    step: 'Langkah 3',
    title: `Pilih metode pembayaran via ${PAYMENT_GATEWAY}`,
    desc: `Jendela pembayaran ${PAYMENT_GATEWAY} terbuka dan menampilkan metode yang tersedia: Virtual Account / transfer bank, QRIS, dan dompet digital (e-wallet). Anda memasukkan detail pembayaran langsung di halaman ${PAYMENT_GATEWAY}; data kartu atau rekening Anda tidak pernah melewati server kami.`,
  },
  {
    icon: CheckCircle2,
    tone: 'lp-icon-green',
    step: 'Langkah 4',
    title: 'Konfirmasi & pembayaran sukses',
    desc: 'Setelah pembayaran dikonfirmasi, Anda melihat halaman berhasil dan paket PRO langsung aktif dengan masa aktif bertambah 30 hari. Kalau jendela tertutup sebelum konfirmasi masuk, status bisa dicek kapan saja lewat tombol "Cek Status Pembayaran" di dashboard.',
  },
]

export default function PaymentFlowPage() {
  return (
    <div className="lp-page">
      <SiteHeader />

      <main className="lp-main">
        <section className="lp-section" aria-labelledby="flow-title">
          <div className="lp-inner">
            <div className="lp-section-head">
              <h1 id="flow-title" className="lp-section-title">
                Alur Pembayaran
              </h1>
              <p className="lp-section-sub">
                Empat langkah dari memilih paket sampai pembayaran berhasil. Pembayaran
                langganan diproses dengan aman oleh {PAYMENT_GATEWAY}.
              </p>
            </div>

            <div className="lp-grid">
              {STEPS.map(({ icon: Icon, tone, step, title, desc }) => (
                <article key={title} className="lp-tile lp-tile-center lp-lift">
                  <span className={`lp-icon lp-icon-lg ${tone}`} aria-hidden="true">
                    <Icon size={28} />
                  </span>
                  <p className="lp-tile-step">{step}</p>
                  <h2 className="lp-tile-title">{title}</h2>
                  <p className="lp-tile-desc">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-section-alt" aria-labelledby="flow-notes-title">
          <div className="lp-inner">
            <div className="lp-section-head">
              <h2 id="flow-notes-title" className="lp-section-title">
                Yang perlu diketahui
              </h2>
            </div>
            <div className="lp-prose" style={{ paddingTop: 0 }}>
              <ul>
                <li>
                  <strong>Tanpa penagihan otomatis.</strong> Masa aktif PRO tidak
                  diperpanjang sendiri. Setiap perpanjangan adalah pembayaran baru yang
                  Anda lakukan dari dashboard.
                </li>
                <li>
                  Perpanjangan sebelum masa aktif habis <strong>menambah</strong> 30 hari
                  di atas sisa hari yang belum terpakai, bukan menggantinya.
                </li>
                <li>
                  Ketentuan lengkap pembayaran ada di{' '}
                  <Link href="/terms">Syarat &amp; Ketentuan</Link>, dan cara data Anda
                  diperlakukan ada di <Link href="/privacy">Kebijakan Privasi</Link>.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="lp-cta-band" aria-labelledby="flow-cta-title">
          <div className="lp-inner">
            <h2 id="flow-cta-title" className="lp-cta-title">
              Siap mulai?
            </h2>
            <p className="lp-cta-sub">
              Buat akun gratis dulu. Anda baru perlu membayar kalau butuh lebih dari satu
              kasir atau fitur PRO lainnya.
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
