import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RealtimeTransactions from './RealtimeTransactions'

export const dynamic = 'force-dynamic'

export default async function Dashboard({ searchParams }) {
  const filter = (await searchParams).filter || 'ALL' // 'ALL', 'CASH', 'QRIS/TF'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch store
  const { data: store } = await supabase
    .from('stores')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!store) {
    redirect('/dashboard/settings')
  }

  // Fetch transactions
  let query = supabase
    .from('transactions')
    .select('*, cashiers(name, telegram_name)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  if (filter !== 'ALL') {
    query = query.eq('payment_method', filter)
  }

  const { data: transactions } = await query

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Ringkasan Toko: {store.name}</h2>
      <RealtimeTransactions initialTransactions={transactions || []} storeId={store.id} filter={filter} />
    </div>
  )
}
