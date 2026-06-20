'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function RealtimeTransactions({ initialTransactions, storeId, filter }) {
  const [transactions, setTransactions] = useState(initialTransactions || [])
  const supabase = createClient()

  useEffect(() => {
    setTransactions(initialTransactions || [])
  }, [initialTransactions])

  useEffect(() => {
    const channel = supabase
      .channel('realtime:transactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `store_id=eq.${storeId}` },
        async (payload) => {
          const newTx = payload.new

          // Ambil nama kasir
          const { data: cashier } = await supabase
            .from('cashiers')
            .select('name')
            .eq('id', newTx.cashier_id)
            .single()

          const txWithCashier = {
            ...newTx,
            cashiers: cashier
          }

          // Terapkan filter di client
          if (filter !== 'ALL' && txWithCashier.payment_method !== filter) {
            return
          }

          setTransactions(prev => [txWithCashier, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, filter, supabase])

  const totalIncome = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)

  return (
    <>
      <div className="card animate-fade-in" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
        <p style={{ opacity: 0.8, display: 'flex', alignItems: 'center' }}>
          Total Pemasukan {filter !== 'ALL' ? `(${filter})` : ''} 
          <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px', marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', backgroundColor: '#86efac', borderRadius: '50%', animation: 'pulse 2s infinite' }}></span> Live
          </span>
        </p>
        <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>Rp {totalIncome.toLocaleString('id-ID')}</h3>
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
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada transaksi.</td>
                </tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.id} className="animate-fade-in">
                    <td>{new Date(tx.created_at).toLocaleString('id-ID')}</td>
                    <td>{tx.cashiers?.name || 'Tidak diketahui'}</td>
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
    </>
  )
}
