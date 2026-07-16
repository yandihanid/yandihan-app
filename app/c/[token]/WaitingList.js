'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function WaitingList({ storeId }) {
  const [tickets, setTickets] = useState([])
  const supabase = createClient()

  useEffect(() => {
    let active = true
    const load = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('id, buyer_name, product_name, status, created_at')
        .eq('store_id', storeId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      if (active) setTickets(data || [])
    }
    load()
    const channel = supabase
      .channel(`waiting-${storeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `store_id=eq.${storeId}` }, load)
      .subscribe()
    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [storeId])

  const markDone = async (id) => {
    await supabase.from('transactions').update({ status: 'done' }).eq('id', id)
    setTickets((prev) => prev.filter((t) => t.id !== id))
  }

  if (!tickets.length) return null

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '1rem auto' }}>
      <h3 style={{ fontWeight: 'bold' }}>📋 Waiting List (Ticket)</h3>
      {tickets.map((t) => (
        <div key={t.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ fontWeight: 700 }}>{t.buyer_name || 'Tanpa Nama'}</div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>{t.product_name}</div>
          <button onClick={() => markDone(t.id)} style={{ marginTop: '0.5rem', padding: '0.25rem 0.75rem', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px' }}>
            Selesai / Panggil
          </button>
        </div>
      ))}
    </div>
  )
}
