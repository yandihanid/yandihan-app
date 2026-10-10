import Link from 'next/link'
import SiteHeader from '@/components/landing/SiteHeader'
import SiteFooter from '@/components/landing/SiteFooter'
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  SUPPORT_EMAIL,
  supportMailto,
  LEGAL_ENTITY,
  BUSINESS_ADDRESS,
} from '@/lib/site'

/**
 * Kontak & Tentang.
 *
 * Halaman ini menampilkan kontak bisnis dan badan hukum penyelenggara dalam
 * satu tempat yang mudah ditemukan -- syarat verifikasi merchant. Semua nilainya
 * (email, alamat, nama PT) datang dari lib/site.js, jadi sama persis dengan yang
 * dipakai footer dan halaman hukum.
 */
export const metadata = {
  title: 'Kontak & Tentang',
  description: `Kontak bisnis ${SITE_NAME} dan badan hukum penyelenggara, ${LEGAL_ENTITY}: alamat usaha dan email resmi.`,
  alternates: { canonical: '/kontak' },
  openGraph: {
    type: 'article',
    locale: 'id_ID',
    url: '/kontak',
    siteName: SITE_NAME,
    title: `Kontak & Tentang | ${SITE_NAME}`,
    description: `Hubungi ${LEGAL_ENTITY}, penyelenggara ${SITE_NAME}.`,
  },
}

export default function ContactPage() {
  const mailto = supportMailto(`Kontak ${SITE_NAME}`)

  return (
    <>
      <SiteHeader />

      <main className="lp-prose">
        <h1>Kontak &amp; Tentang</h1>

        <div className="lp-prose-summary">
          <p>{SITE_DESCRIPTION}</p>
        </div>

        <h2>Tentang {SITE_NAME}</h2>
        <p>
          <strong>{SITE_NAME}</strong> adalah produk dari{' '}
          <strong>{LEGAL_ENTITY}</strong>. Merek &quot;Yandihan&quot; dan
          &quot;Yandihan Kasir&quot; dimiliki dan dioperasikan oleh {LEGAL_ENTITY}.
        </p>

        <h2>Kontak bisnis</h2>
        <p>
          <strong>Email:</strong>{' '}
          {mailto ? <a href={mailto}>{SUPPORT_EMAIL}</a> : SUPPORT_EMAIL}
        </p>
        <p>
          <strong>Alamat bisnis:</strong> {BUSINESS_ADDRESS}
        </p>

        <h2>Operasional &amp; badan hukum</h2>
        <p>
          Layanan ini diselenggarakan oleh {LEGAL_ENTITY}, yang bertanggung jawab atas
          pengelolaan layanan, penagihan langganan, dan penanganan pertanyaan pengguna.
          Untuk urusan apa pun yang berkaitan dengan akun atau pembayaran Anda, kirim
          email dari alamat email akun Anda ke alamat kontak di atas.
        </p>

        <h2>Tautan terkait</h2>
        <p>
          Pelajari cara pembayaran di <Link href="/alur-pembayaran">Alur Pembayaran</Link>,
          ketentuan pemakaian di <Link href="/terms">Syarat &amp; Ketentuan</Link>, dan
          pengelolaan data di <Link href="/privacy">Kebijakan Privasi</Link>.
        </p>
      </main>

      <SiteFooter />
    </>
  )
}
