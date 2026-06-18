import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
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
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, cashiers(telegram_name)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  const totalIncome = transactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Ringkasan Toko: {store.name}</h2>
      
      <div className="card" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
        <p style={{ opacity: 0.8 }}>Total Pemasukan</p>
        <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Rp {totalIncome.toLocaleString('id-ID')}</h3>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Riwayat Transaksi</h3>
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
                    <td>{tx.cashiers?.telegram_name || 'Tidak diketahui'}</td>
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
