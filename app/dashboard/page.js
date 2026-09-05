import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { verifySession, getMyStore } from '@/lib/dal'
import { planTier } from '@/lib/plan'
import { wibRangeFor } from '@/lib/time'
import RealtimeTransactions from './RealtimeTransactions'
import UpgradeBanner from './UpgradeBanner'

export const dynamic = 'force-dynamic'

// Nilai dari query string tidak dipercaya apa adanya: keduanya ikut masuk ke
// query PostgREST, dan `time` yang tidak dikenal dulu diam-diam berarti
// "semua waktu".
const PAYMENT_FILTERS = new Set(['ALL', 'CASH', 'QRIS/TF'])
const TIME_FILTERS = new Set(['TODAY', 'THIS_MONTH', 'ALL_TIME'])

export default async function Dashboard({ searchParams }) {
  const params = (await searchParams) || {}
  const filter = PAYMENT_FILTERS.has(params.filter) ? params.filter : 'ALL'
  const timeFilter = TIME_FILTERS.has(params.time) ? params.time : 'TODAY'

  await verifySession('/dashboard')

  // getMyStore() memakai maybeSingle() + order/limit. Sebelumnya .single() di
  // sini membuat pemilik dengan lebih dari satu toko kena PGRST116 dan
  // terlempar bolak-balik ke /dashboard/settings (temuan C11).
  const store = await getMyStore()
  if (!store) redirect('/dashboard/settings')

  // Batas hari dihitung SEKALI di server menurut WIB, lalu diturunkan sebagai
  // prop ke komponen realtime. Dulu server memakai zona waktu mesinnya (UTC di
  // Vercel) sementara RealtimeTransactions menghitungnya lagi di browser (WIB),
  // jadi daftar hasil render server dan baris realtime memakai dua batas hari
  // yang berbeda (temuan C5). Rentangnya setengah-terbuka, sehingga detik
  // terakhir tiap hari tidak lagi hilang.
  const range = wibRangeFor(timeFilter)

  const supabase = await createClient()
  let query = supabase
    .from('transactions')
    .select('*, cashiers(name)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  if (filter !== 'ALL') query = query.eq('payment_method', filter)
  if (range) query = query.gte('created_at', range.start).lt('created_at', range.end)

  const { data: transactions } = await query

  // planTier(), bukan store.subscription_tier mentah: PRO yang masa aktifnya
  // sudah lewat kini dihitung GRATIS di seluruh aplikasi (temuan C9).
  const tier = planTier(store)

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <UpgradeBanner
        storeId={store.id}
        subscriptionTier={tier}
        subscriptionEndDate={store.subscription_end_date}
      />

      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: tier === 'FREE' ? '1rem' : '0' }}>
        Ringkasan Toko: {store.name}
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 'bold',
            marginLeft: '0.5rem',
            backgroundColor: tier === 'PRO' ? 'var(--secondary-color)' : 'var(--border-color)',
            color: tier === 'PRO' ? 'var(--primary-color)' : 'var(--text-muted)',
            padding: '0.2rem 0.6rem',
            borderRadius: '99px',
            verticalAlign: 'middle',
          }}
        >
          {tier}
        </span>
      </h2>

      {/* key: ganti filter = komponen baru, jadi state daftar ikut reset tanpa
          perlu useEffect yang menulis state saat render (aturan
          react-hooks/set-state-in-effect). */}
      <RealtimeTransactions
        key={`${filter}|${timeFilter}`}
        initialTransactions={transactions || []}
        storeId={store.id}
        filter={filter}
        timeFilter={timeFilter}
        rangeStart={range?.start ?? null}
        rangeEnd={range?.end ?? null}
      />
    </div>
  )
}
