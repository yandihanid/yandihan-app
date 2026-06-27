import { createServiceClient } from '@/utils/supabase/service'
import { notFound } from 'next/navigation'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

export default async function ReceiptPage({ params }) {
  const id = (await params).id

  const supabase = createServiceClient()

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .select('*, stores(name), cashiers(name, token)')
    .eq('id', id)
    .single()

  if (txError || !tx) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Struk Tidak Ditemukan</h1>
        <p>ID Transaksi: {id}</p>
        <p>Detail Error: {txError?.message || 'Data transaksi kosong.'}</p>
      </div>
    )
  }

  const cashierName = tx.cashiers?.name || 'Kasir'

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
      <div 
        className="receipt-container"
        style={{ 
          backgroundColor: 'white', 
          width: '100%', 
          maxWidth: '350px', 
          padding: '2rem', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          fontFamily: 'monospace',
          color: 'black'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>{tx.stores?.name}</h1>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Bukti Pembayaran</p>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{new Date(tx.created_at).toLocaleString('id-ID')}</p>
        </div>

        <div style={{ borderTop: '2px dashed #ccc', margin: '1rem 0' }}></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Kasir:</span>
          <span>{cashierName}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Metode:</span>
          <span>{tx.payment_method}</span>
        </div>
        {tx.payment_method === 'QRIS/TF' && tx.receipt_url && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Bukti TF:</span>
            <a href={tx.receipt_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Terlampir</a>
          </div>
        )}

        <div style={{ borderTop: '2px dashed #ccc', margin: '1rem 0' }}></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.125rem' }}>
          <span>{tx.product_name || 'Pembelian'}</span>
          <span>Rp {Number(tx.amount).toLocaleString('id-ID')}</span>
        </div>

        <div style={{ borderTop: '2px dashed #ccc', margin: '1rem 0' }}></div>

        <div style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '2rem' }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>Terima kasih atas kunjungan Anda!</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>Powered by Yandihan</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background-color: white; }
          .receipt-container { box-shadow: none !important; padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
        }
      `}} />
      
      <PrintButton cashierToken={tx.cashiers?.token} />
    </div>
  )
}
