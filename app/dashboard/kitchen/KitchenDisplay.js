'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { formatRupiah, formatDateTimeWib } from '@/lib/format'

export default function KitchenDisplay({ storeId, storeName }) {
  const [orders, setOrders] = useState([])
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('id, amount, product_name, queue_number, table_number, created_at, status, payment_method')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(50)
    setOrders(data || [])
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`kds:${storeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `store_id=eq.${storeId}` }, (payload) => {
        const newOrder = payload.new
        setOrders((prev) => (prev.some((o) => o.id === newOrder.id) ? prev : [newOrder, ...prev]))
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('Pesanan baru', { body: `${newOrder.product_name || 'Pesanan'}${newOrder.table_number ? ` - Meja ${newOrder.table_number}` : ''}` })
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission()
          }
        }
        try {
          const audio = new Audio('/notification.mp3')
          audio.play().catch(() => {})
        } catch {}
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId])

  return (
    <main style={{ padding: '1rem' }}>
      <h1>Kitchen Display System - {storeName}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {orders.map((o) => (
          <div key={o.id} className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{o.queue_number ? `#${o.queue_number}` : '-'}</strong>
              <span>{o.table_number ? `Meja ${o.table_number}` : ''}</span>
            </div>
            <p style={{ margin: '0.5rem 0' }}>{o.product_name}</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{formatRupiah(o.amount)}</p>
            <small>{formatDateTimeWib(o.created_at)}</small>
          </div>
        ))}
      </div>
      {orders.length === 0 && <p style={{ marginTop: '2rem', color: 'var(--text-muted)' }}>Belum ada pesanan.</p>}
    </main>
  )
}
