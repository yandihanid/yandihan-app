'use client'

import { useState, useEffect } from 'react'
import CashierForm from './CashierForm'
import WaitingList from './WaitingList'
import { useParams } from 'next/navigation'

const PREFIX = 'yandihan_cashier_meta_'

export default function CashierWeb() {
  const { token } = useParams()
  const [cashier, setCashier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsOnline(navigator.onLine)
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    const cached = JSON.parse(localStorage.getItem(PREFIX + token) || 'null')
    if (cached?.id) {
      setCashier(cached)
      setLoading(false)
    }
    let cancelled = false
    const load = async () => {
      const deviceId = localStorage.getItem('yandihan_device_id') || 'dev_' + Math.random().toString(36).slice(2, 9)
      localStorage.setItem('yandihan_device_id', deviceId)
      const res = await fetch(`/api/cashier?token=${token}&deviceId=${deviceId}`)
      if (cancelled) return
      if (res.ok) {
        const data = await res.json()
        setCashier(data)
        localStorage.setItem(PREFIX + token, JSON.stringify(data))
      } else if (!cached?.id) {
        setCashier({ error: 'Link tidak valid' })
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [token])

  if (loading) return <p style={{ textAlign: 'center', marginTop: '4rem' }}>Memuat...</p>
  if (!cashier || cashier.error) return <p style={{ textAlign: 'center', marginTop: '4rem', color: '#ef4444' }}>{cashier?.error || 'Link tidak valid'}</p>

  const store = cashier.stores || {}
  return (
    <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
      <header style={{ textAlign: 'center', margin: '2rem 0' }}>
        <h1 style={{ color: 'var(--primary-color)' }}>{store.name}</h1>
        <p>{cashier.name}</p>
        <span style={{ fontSize: '0.75rem', color: isOnline ? 'green' : 'red' }}>{isOnline ? 'Online' : 'Offline'}</span>
      </header>
      <main style={{ maxWidth: 500, margin: '0 auto' }}>
        <div className="card">
          <CashierForm
            cashierId={cashier.id}
            storeId={cashier.store_id}
            token={token}
            products={cashier.products || []}
            receiptRequired={store.receipt_required ?? true}
            requireSubProduct={store.require_sub_product ?? false}
            requireCustomerName={store.require_customer_name ?? false}
          />
        </div>
      </main>
      {store.waiting_list_enabled && <WaitingList storeId={cashier.store_id} />}
    </div>
  )
}
