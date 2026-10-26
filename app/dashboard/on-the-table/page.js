import Link from 'next/link'
import { verifySession, getMyStore } from '@/lib/dal'
import { hasOnTableFeature, ON_TABLE_ADDON_PRICE_IDR } from '@/lib/plan'
import { formatRupiah } from '@/lib/format'
import OnTheTableManager from './OnTheTableManager'

export const dynamic = 'force-dynamic'

export default async function OnTheTablePage() {
  await verifySession('/dashboard/on-the-table')
  const store = await getMyStore()
  if (!store) return <div style={{ padding: '2rem' }}>Buat toko dulu.</div>

  if (!hasOnTableFeature(store)) {
    return (
      <div className="animate-fade-in" style={{ padding: '1rem' }}>
        <section className="card" style={{ maxWidth: 640, margin: '2rem auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Fitur On the Table Terkunci</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Menu On the Table hanya tersedia sebagai add-on paket PRO. Aktifkan add-on
            sebesar <strong>{formatRupiah(ON_TABLE_ADDON_PRICE_IDR)} / bulan</strong> untuk
            membuat QR meja, menerima pesanan, dan menampilkan pesanan di KDS.
          </p>
          <Link
            href="/dashboard/billing"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '99px',
              backgroundColor: 'var(--primary-color)',
              color: '#fff',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Aktifkan Add-on On the Table
          </Link>
        </section>
      </div>
    )
  }

  return <OnTheTableManager storeId={store.id} storeName={store.name} />
}
