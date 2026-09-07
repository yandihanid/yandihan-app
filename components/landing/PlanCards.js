import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { PRO_PRICE_IDR } from '@/lib/plan'
import { FREE_FEATURES, PRO_FEATURES } from '@/lib/plans.content'
import { formatRupiah } from '@/lib/format'

/**
 * Kartu harga, dipakai landing page dan /pricing. Server Component.
 *
 * Harga PRO dibaca dari PRO_PRICE_IDR, bukan ditulis sebagai teks. Versi
 * sebelumnya menulis "Rp 78.000" literal di landing sementara tagihan Midtrans
 * mengirim angka lain -- pelanggan melihat satu harga dan dibebani harga lain.
 *
 * Tujuan CTA PRO: `/login?next=/dashboard`. Belum ada rute checkout mandiri di
 * aplikasi ini -- UpgradeBanner hanya dirender di dalam /dashboard
 * (app/dashboard/page.js:56), jadi upgrade memang mensyaratkan pemilik yang
 * sudah masuk dan sudah punya toko. Mengarahkannya ke halaman yang tidak ada
 * akan jadi 404; mengarahkannya ke /login dengan penjelasan singkat di bawah
 * tombol adalah keadaan sebenarnya.
 */
export default function PlanCards({ headingLevel: H = 'h3' }) {
  return (
    <div className="lp-plans">
      <article className="lp-plan">
        <span className="lp-plan-tag">GRATIS</span>
        <H className="lp-plan-price">
          Rp 0 <span className="lp-plan-period">/ selamanya</span>
        </H>
        <p className="lp-plan-desc">
          Cukup untuk warung, kedai, atau toko yang dijaga sendiri. Tanpa kartu kredit, tanpa masa
          percobaan yang habis.
        </p>

        <ul className="lp-plan-list">
          {FREE_FEATURES.map((f) => (
            <FeatureItem key={f.label} feature={f} color="var(--success-color)" />
          ))}
        </ul>

        <Link href="/signup" className="btn btn-secondary lp-plan-cta">
          Mulai Gratis
        </Link>
      </article>

      <article className="lp-plan lp-plan-featured">
        <span className="lp-plan-ribbon">PALING POPULER</span>
        <span className="lp-plan-tag">PRO</span>
        <H className="lp-plan-price">
          {formatRupiah(PRO_PRICE_IDR)} <span className="lp-plan-period">/ bulan</span>
        </H>
        <p className="lp-plan-desc">
          Untuk toko yang sudah punya pegawai dan pelanggan langganan. Dibayar per bulan, bisa
          berhenti kapan saja.
        </p>

        <ul className="lp-plan-list">
          {PRO_FEATURES.map((f) => (
            <FeatureItem key={f.label} feature={f} color="var(--primary-color)" />
          ))}
        </ul>

        <Link href="/login?next=/dashboard" className="btn btn-primary lp-plan-cta">
          Berlangganan PRO
        </Link>
        <p className="lp-plan-note">
          Pembayaran dilakukan dari dashboard setelah Anda masuk. Belum punya akun?{' '}
          <Link href="/signup">Daftar gratis dulu</Link> — upgrade bisa kapan saja.
        </p>
      </article>
    </div>
  )
}

function FeatureItem({ feature, color }) {
  return (
    <li className={feature.soon ? 'lp-plan-item lp-plan-item-soon' : 'lp-plan-item'}>
      <CheckCircle2 size={18} color={feature.soon ? 'var(--text-muted)' : color} aria-hidden="true" />
      <span style={feature.strong ? { fontWeight: 700 } : undefined}>
        {feature.label}
        {feature.soon && <span className="lp-plan-soon-tag">segera</span>}
      </span>
    </li>
  )
}
