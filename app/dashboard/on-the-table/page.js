import Link from 'next/link'
import { verifySession, getMyStore } from '@/lib/dal'
import { createClient } from '@/utils/supabase/server'
import { hasOnTableFeature, ON_TABLE_ADDON_PRICE_IDR } from '@/lib/plan'
import { formatRupiah } from '@/lib/format'
import { SITE_URL } from '@/lib/site'
import OnTheTableManager from './OnTheTableManager'
import XenditPayoutCard from './XenditPayoutCard'

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

  // Dibaca terpisah, bukan lewat getMyStore(), supaya kolom rekening tidak ikut
  // ter-serialize ke komponen dashboard lain yang memakai STORE_COLUMNS.
  const supabase = await createClient()
  const { data: payout } = await supabase
    .from('stores')
    .select('xendit_sub_account_id')
    .eq('id', store.id)
    .maybeSingle()

  return (
    <div className="animate-fade-in">
      <XenditPayoutCard
        storeId={store.id}
        initialSubAccountId={payout?.xendit_sub_account_id ?? null}
        splitEnabled={Boolean(process.env.XENDIT_SPLIT_RULE_ID)}
        callbackUrl={`${SITE_URL}/api/payment/xendit/callback`}
      />
      <OnTheTableManager storeId={store.id} storeName={store.name} />
    </div>
  )
}
