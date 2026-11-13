import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServiceClient } from '@/utils/supabase/service'
import { isPlatformAdmin } from '@/lib/platform'
import { formatRupiah } from '@/lib/format'
import { getStoreBalance, summarizeBalance } from '@/lib/storePayout'
import PayoutManager from './PayoutManager'

export const dynamic = 'force-dynamic'

/**
 * Halaman pencairan untuk pengelola platform.
 *
 * Halaman ini satu-satunya tempat yang melihat SEMUA toko, jadi penjaga
 * aksesnya tidak bisa hanya "pemilik toko" -- harus pengelola platform yang
 * terdaftar di PLATFORM_ADMIN_USER_IDS.
 *
 * Kenapa perlu halaman terpisah: dashboard aplikasi ini multi-tenant, dan
 * setiap pemilik toko hanya boleh melihat tokonya sendiri. Yang jammed
 * (mengirim uang ke rekening orang) memang pekerjaan pemilik usaha, bukan
 * pekerjaan pemilik toko -- makanya halaman ini tidak memakai hak akses
 * toko, tapi hak akses platform.
 */
export default async function PencairanPage() {
  const user = await verifySession('/dashboard/pencairan')

  if (!isPlatformAdmin(user)) {
    redirect('/dashboard')
  }

  const service = createServiceClient()

  const { data: stores } = await service
    .from('stores')
    .select(
      'id, name, payout_enabled, payout_bank_code, payout_account_number, payout_account_name, payout_fee_percent, payout_minimum_idr, subscription_tier'
    )
    .order('name', { ascending: true })

  const storeList = stores || []

  // Saldo per toko. Query-nya satu per toko, tapi jumlah toko masih sedikit
  // dan halaman ini jarang dibuka -- yang penting angkanya benar.
  const balances = await Promise.all(
    storeList.map(async (store) => {
      const balance = await getStoreBalance(service, store.id)
      const summary = summarizeBalance(store, balance)
      return { storeId: store.id, summary, error: balance.error }
    })
  )

  const { data: payouts } = await service
    .from('store_payouts')
    .select(
      'id, store_id, amount, gross_amount, fee_amount, service_fee_amount, order_count, status, bank_code, account_number, account_holder_name, failure_reason, created_at, paid_at, xendit_disbursement_id'
    )
    .order('created_at', { ascending: false })
    .limit(50)

  const storeNames = new Map(storeList.map((store) => [store.id, store.name]))

  const totals = balances.reduce(
    (acc, entry) => {
      acc.gross += entry.summary.gross
      acc.amount += entry.summary.amount
      acc.serviceFee += entry.summary.serviceFee
      acc.fee += entry.summary.fee
      return acc
    },
    { gross: 0, amount: 0, serviceFee: 0, fee: 0 }
  )

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Pencairan Dana Toko</h2>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Semua pembayaran QR meja masuk ke satu akun Xendit platform. Dari sini uang tiap toko
          dikirim ke rekening yang mereka daftarkan, sesuai omzet mereka.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <Stat label="Saldo belum dicairkan" value={formatRupiah(totals.amount)} hint="Siap dikirim ke toko" />
        <Stat label="Omzet toko berjalan" value={formatRupiah(totals.gross)} hint="Total barang yang terjual" />
        <Stat label="Biaya layanan platform" value={formatRupiah(totals.serviceFee)} hint="Pendapatan platform" />
        <Stat label="Potongan platform" value={formatRupiah(totals.fee)} hint="Dipotong dari omzet toko" />
      </div>

      <PayoutManager
        stores={storeList}
        balances={balances}
        payouts={(payouts || []).map((payout) => ({
          ...payout,
          storeName: storeNames.get(payout.store_id) || 'Toko dihapus',
        }))}
      />
    </div>
  )
}

function Stat({ label, value, hint }) {
  return (
    <div className="card" style={{ padding: '1.25rem', minWidth: 0 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem', overflowWrap: 'anywhere' }}>
        {value}
      </p>
      {hint && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', marginBottom: 0 }}>
          {hint}
        </p>
      )}
    </div>
  )
}
