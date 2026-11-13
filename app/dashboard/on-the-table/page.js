import Link from 'next/link'
import { verifySession, getMyStore } from '@/lib/dal'
import { createServiceClient } from '@/utils/supabase/service'
import { hasOnTableFeature, ON_TABLE_ADDON_PRICE_IDR } from '@/lib/plan'
import { formatRupiah } from '@/lib/format'
import { getStoreBalance, summarizeBalance } from '@/lib/storePayout'
import OnTheTableManager from './OnTheTableManager'
import StorePayoutCard from './StorePayoutCard'

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

  // Setelan pencairan dibaca terpisah dari getMyStore() supaya kolom ini tidak
  // ikut ter-serialize ke komponen dashboard lain yang memakai STORE_COLUMNS.
  // Tabel `table_orders` dan `store_payouts` tidak punya policy RLS untuk
  // pengguna, jadi keduanya dibaca lewat service role.
  const service = createServiceClient()
  const [{ data: payout }, balance, { data: history }] = await Promise.all([
    service
      .from('stores')
      .select('payout_enabled, payout_bank_code, payout_account_number, payout_account_name, payout_minimum_idr')
      .eq('id', store.id)
      .maybeSingle(),
    getStoreBalance(service, store.id),
    service
      .from('store_payouts')
      .select('id, amount, gross_amount, fee_amount, status, bank_code, account_number, created_at, paid_at')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const summary = summarizeBalance(store, balance)

  return (
    <div className="animate-fade-in">
      <StorePayoutCard
        storeId={store.id}
        payout={payout}
        balance={{
          amountFormatted: formatRupiah(summary.amount),
          orderCount: summary.orderCount,
        }}
      />

      {history && history.length > 0 && (
        <section className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Riwayat Pencairan</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Omzet</th>
                  <th>Potongan</th>
                  <th>Dicairkan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
                    <td>{formatRupiah(row.gross_amount)}</td>
                    <td>-{formatRupiah(row.fee_amount)}</td>
                    <td>{formatRupiah(row.amount)}</td>
                    <td>{payoutStatusLabel(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <OnTheTableManager storeId={store.id} storeName={store.name} />
    </div>
  )
}

function payoutStatusLabel(status) {
  if (status === 'paid') return 'Sudah masuk rekening'
  if (status === 'submitted') return 'Diproses bank'
  if (status === 'failed') return 'Gagal'
  return 'Menunggu'
}
