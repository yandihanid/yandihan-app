import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RealtimeTransactions from './RealtimeTransactions'
import UpgradeBanner from './UpgradeBanner'

export const dynamic = 'force-dynamic'

export default async function Dashboard({ searchParams }) {
  const filter = (await searchParams).filter || 'ALL' // 'ALL', 'CASH', 'QRIS/TF'
  const timeFilter = (await searchParams).time || 'TODAY' // 'TODAY', 'THIS_MONTH', 'ALL_TIME'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch store
  const { data: store } = await supabase
    .from('stores')
    .select('id, name, subscription_tier')
    .eq('user_id', user.id)
    .single()

  if (!store) {
    redirect('/dashboard/settings')
  }

  // Fetch transactions
  let query = supabase
    .from('transactions')
    .select('*, cashiers(name), cash_received, change_amount') // Explicitly select cash_received and change_amount
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  if (filter !== 'ALL') {
    query = query.eq('payment_method', filter)
  }

  const now = new Date()
  if (timeFilter === 'TODAY') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    query = query.gte('created_at', today.toISOString())
  } else if (timeFilter === 'THIS_MONTH') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    query = query.gte('created_at', monthStart.toISOString())
  }

  const { data: transactions } = await query

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <UpgradeBanner storeId={store.id} subscriptionTier={store.subscription_tier} />
      
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: store.subscription_tier === 'FREE' ? '1rem' : '0' }}>
        Ringkasan Toko: {store.name} 
        <span style={{ fontSize: '0.875rem', fontWeight: 'bold', marginLeft: '0.5rem', backgroundColor: store.subscription_tier === 'PRO' ? 'var(--secondary-color)' : 'var(--border-color)', color: store.subscription_tier === 'PRO' ? 'var(--primary-color)' : 'var(--text-muted)', padding: '0.2rem 0.6rem', borderRadius: '99px', verticalAlign: 'middle' }}>
          {store.subscription_tier}
        </span>
      </h2>
      <RealtimeTransactions initialTransactions={transactions || []} storeId={store.id} filter={filter} timeFilter={timeFilter} />
    </div>
  )
}
