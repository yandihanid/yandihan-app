import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  const totalIncome = transactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Ringkasan Toko: {store.name}</h2>
      
      <div className="card" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
        <p style={{ opacity: 0.8 }}>Total Pemasukan {filter !== 'ALL' ? `(${filter})` : ''}</p>
        <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Rp {totalIncome.toLocaleString('id-ID')}</h3>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Riwayat Transaksi</h3>
          
          {/* Toggle Filter */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '0.25rem' }}>
            <Link 
              href="/dashboard?filter=ALL" 
              style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', backgroundColor: filter === 'ALL' ? 'white' : 'transparent', color: filter === 'ALL' ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: filter === 'ALL' ? 'var(--shadow-sm)' : 'none' }}
            >
              Semua
            </Link>
            <Link 
              href="/dashboard?filter=CASH" 
              style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', backgroundColor: filter === 'CASH' ? 'white' : 'transparent', color: filter === 'CASH' ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: filter === 'CASH' ? 'var(--shadow-sm)' : 'none' }}
            >
              Tunai
            </Link>
            <Link 
              href="/dashboard?filter=QRIS/TF" 
              style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', backgroundColor: filter === 'QRIS/TF' ? 'white' : 'transparent', color: filter === 'QRIS/TF' ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: filter === 'QRIS/TF' ? 'var(--shadow-sm)' : 'none' }}
            >
              QRIS/TF
            </Link>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Kasir</th>
                <th>Produk</th>
                <th>Metode</th>
                <th>Nominal</th>
                <th>Bukti</th>
              </tr>
            </thead>
            <tbody>
              {transactions?.length === 0 || !transactions ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada transaksi.</td>
                </tr>
              ) : (
                transactions?.map(tx => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.created_at).toLocaleString('id-ID')}</td>
                    <td>{tx.cashiers?.name || tx.cashiers?.telegram_name || 'Tidak diketahui'}</td>
                    <td>{tx.product_name}</td>
                    <td>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '99px', 
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        backgroundColor: tx.payment_method === 'CASH' ? '#d1fae5' : '#dbeafe',
                        color: tx.payment_method === 'CASH' ? '#065f46' : '#1e40af'
                      }}>
                        {tx.payment_method}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500' }}>Rp {Number(tx.amount).toLocaleString('id-ID')}</td>
                    <td>
                      {tx.receipt_url ? (
                        <a href={tx.receipt_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary-color)' }}>Lihat</a>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
