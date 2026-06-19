import { createServiceClient } from '@/utils/supabase/service'
import { notFound } from 'next/navigation'
import CashierForm from './CashierForm'

export const dynamic = 'force-dynamic'

export default async function CashierWeb({ params }) {
  const token = (await params).token

  const supabase = createServiceClient()

  // Find cashier and store
  const { data: cashier } = await supabase
    .from('cashiers')
    .select('*, stores(name)')
    .eq('token', token)
    .single()

  if (!cashier) {
    return notFound()
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
      <header style={{ textAlign: 'center', margin: '2rem 0' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
          {cashier.stores?.name}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Halo, {cashier.name || 'Kasir'}</p>
      </header>

      <main className="container animate-fade-in" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Lapor Transaksi</h2>
          <CashierForm cashierId={cashier.id} storeId={cashier.store_id} token={token} />
        </div>
      </main>
    </div>
  )
}
