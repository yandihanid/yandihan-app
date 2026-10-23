import { createClient } from '@/utils/supabase/server'
import { verifySession, getMyStore } from '@/lib/dal'
import { planTier, isPro, PRO_PRICE_IDR, PRO_ANNUAL_PRICE_IDR, SUBSCRIPTION_PLANS } from '@/lib/plan'
import { formatRupiah } from '@/lib/format'
import { expireStaleSubscriptionOrders } from '@/lib/subscriptionOrders'
import { TAX_INFO, LEGAL_ENTITY, PAYMENT_GATEWAY } from '@/lib/site'
import OnboardingChecklist from '../OnboardingChecklist'
import UpgradeBanner from '../UpgradeBanner'
import OrderActionRow from './OrderActionRow'
import { Calendar, CheckCircle2, Clock, Download, FileText, Info, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Billing & Langganan',
}

/**
 * Halaman Billing: menampilkan riwayat tagihan + fitur langganan.
 * - Diakses langsung /dashboard/billing -> tampilkan halaman lengkap
 * - Dari UpgradeBanner redirect -> halaman ini tetap tampil lengkap
 * - Tombol "Beli" di header akanarah ke halaman ini
 */

export default async function BillingPage() {
  await verifySession('/dashboard/billing')

  const store = await getMyStore()
  if (!store) {
    return (
      <div className="animate-fade-in flex flex-col gap-4">
        <OnboardingChecklist store={null} />
      </div>
    )
  }

  const tier = planTier(store)
  const activePro = isPro(store)
  const expiryDate = store.subscription_end_date ? new Date(store.subscription_end_date) : null

  // Bersihkan order pending yang sudah kedaluwarsa SEBELUM daftar dibaca,
  // supaya riwayat tidak menampilkan "menunggu" untuk pembayaran yang sudah
  // tidak mungkin diselesaikan.
  await expireStaleSubscriptionOrders()

  // Ambil riwayat order langganan toko (hanya yang sudah lunas)
  const supabase = await createClient()
  const { data: orders } = await supabase
    .from('subscription_orders')
    .select('order_id, amount, plan, status, consumed_at, created_at')
    .eq('store_id', store.id)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem' }}>
          Billing & Langganan
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', margin: 0 }}>
          Kelola paket langganan toko, riwayat tagihan, dan informasi legalitas resmi.
        </p>
      </div>

      <UpgradeBanner
        storeId={store.id}
        subscriptionTier={tier}
        subscriptionEndDate={store.subscription_end_date}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.25rem' }}>
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Paket Saat Ini</h3>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                backgroundColor: activePro ? 'var(--secondary-color)' : 'var(--border-color)',
                color: activePro ? 'var(--primary-color)' : 'var(--text-muted)',
                padding: '0.25rem 0.75rem',
                borderRadius: '99px',
              }}
            >
              {activePro ? 'YANDIHAN PRO' : 'GRATIS'}
            </span>
          </div>

          <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="var(--primary-color)" />
              <span>
                <strong>
                  {expiryDate
                    ? expiryDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : activePro
                    ? 'Aktif Permanen'
                    : 'Selamanya'}
                </strong>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="var(--success-color)" />
              <span>Slot Kasir: <strong>{activePro ? 'Tanpa Batas (Unlimited)' : '1 Kasir'}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="var(--success-color)" />
              <span>Fitur Loyalitas: <strong>{activePro ? 'Aktif' : 'Terkunci'}</strong></span>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Pilihan Paket Langganan:
              <br />
              • Bulanan: <strong>{formatRupiah(PRO_PRICE_IDR)} / bulan</strong>
              <br />
              • Tahunan: <strong>{formatRupiah(PRO_ANNUAL_PRICE_IDR)} / tahun</strong> (Hemat 17%, setara Rp 65.000/bln)
            </p>
          </div>
        </section>
      </div>

      {/* Informasi Kredensial Pajak (Suket PP 55 / 2022) */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} color="var(--primary-color)" />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
            Legalitas & Bukti Perpajakan
          </h3>
        </div>

        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--bg-color)',
            borderRadius: 'var(--border-radius-sm)',
            border: '1px solid var(--border-color)',
            fontSize: '0.85rem',
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Status Wajib Pajak:</span>
            <strong style={{ color: 'var(--success-color)' }}>PP 55 / 2022 (PPh Final UMKM 0,5%)</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Nomor Suket:</span>
            <strong style={{ fontFamily: 'monospace' }}>{TAX_INFO.suketNumber}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Wajib Pajak:</span>
            <span>{TAX_INFO.taxpayerName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>NPWP:</span>
            <span style={{ fontFamily: 'monospace' }}>{TAX_INFO.npwp}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>KPP Terdaftar:</span>
            <span>{TAX_INFO.kpp}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Badan Usaha / Operator:</span>
            <span>{LEGAL_ENTITY}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginTop: 'auto' }}>
          <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.5, flex: '1 1 200px' }}>
            <Info size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Transaksi sah dan mematuhi perpajakan RI (PP 55 Tahun 2022).
          </p>
          <a
            href="/suket-pp-55-2022.pdf"
            download="Suket-PP-55-Yandihan.pdf"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              padding: '0.4rem 0.8rem',
              backgroundColor: 'var(--secondary-color)',
              color: 'var(--primary-color)',
              border: '1px solid var(--primary-color)',
              borderRadius: '6px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Download size={14} />
            Unduh Dokumen Suket PP 55 (PDF)
          </a>
        </div>
      </section>

      <section className="card">
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
          Riwayat Pembayaran Berhasil
        </h3>

        {orders && orders.length > 0 ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>No. Order</th>
                  <th>Paket</th>
                  <th>Nominal</th>
                  <th>Status</th>
                  <th>Tanggal Order</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => {
                  return (
                    <tr key={ord.order_id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{ord.order_id}</td>
                      <td>
                        {ord.plan === 'PRO_ANNUAL' || Number(ord.amount) >= 700000
                          ? 'PRO Tahunan (1 Tahun)'
                          : 'PRO Bulanan (30 Hari)'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatRupiah(ord.amount)}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '99px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                          }}
                        >
                          Lunas
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(ord.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <OrderActionRow order={ord} storeId={store.id} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <FileText size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
            <p style={{ margin: 0 }}>Belum ada riwayat transaksi tagihan.</p>
          </div>
        )}
      </section>
    </div>
  )
}