'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import CashierForm from './CashierForm'
import WaitingList from './WaitingList'
import { useParams } from 'next/navigation'

const CASHIER_META_PREFIX = 'yandihan_cashier_meta_'

function getCashierCacheKey(token) {
  return `${CASHIER_META_PREFIX}${token}`
}

function loadCachedCashier(token) {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(getCashierCacheKey(token))
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

function cacheCashier(token, data) {
  try {
    localStorage.setItem(getCashierCacheKey(token), JSON.stringify(data))
  } catch { /* ignore */ }
}

export default function CashierWeb() {
  const params = useParams()
  const token = Array.isArray(params.token) ? params.token[0] : params.token

  const [cashier, setCashier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [isCapacitor, setIsCapacitor] = useState(false)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [customerSaved, setCustomerSaved] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [discountMessage, setDiscountMessage] = useState('')
  const [customerConfirmed, setCustomerConfirmed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsCapacitor(navigator.userAgent.includes('YandihanKasirApp'))
      setIsOnline(navigator.onLine)
      const handleOnline = () => setIsOnline(true)
      const handleOffline = () => setIsOnline(false)
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  useLayoutEffect(() => {
    if (!token) return
    const cached = loadCachedCashier(token)
    if (cached?.id) {
      setCashier(cached)
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    const cached = loadCachedCashier(token)
    let cancelled = false
    async function load() {
      try {
        let deviceId = localStorage.getItem('yandihan_device_id')
        if (!deviceId) {
          deviceId = 'dev_' + Math.random().toString(36).substr(2, 9)
          localStorage.setItem('yandihan_device_id', deviceId)
        }
        const res = await fetch(`/api/cashier?token=${token}&deviceId=${deviceId}`)
        if (cancelled) return
        if (!res.ok) {
          if (res.status === 403) {
             const errorData = await res.json()
             setCashier({ error: errorData.error })
          } else {
             if (!cached?.id) setError(true)
          }
          setLoading(false)
          return
        }
        const data = await res.json()
        setCashier(data)
        cacheCashier(token, data)
        setError(false)
      } catch {
        if (!cancelled && !cached?.id) setError(true)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [token])

  if (!token) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>Link Tidak Valid</h1>
        </div>
      </div>
    )
  }

  if (loading && !cashier) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Memuat data kasir...</p>
        </div>
      </div>
    )
  }

  if (error || !cashier) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>Link Tidak Valid</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Link kasir ini tidak ditemukan atau sudah tidak berlaku.</p>
        </div>
      </div>
    )
  }

  if (cashier && cashier.error) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
        <div style={{ textAlign: 'center', marginTop: '4rem', padding: '2rem', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '1rem' }}>Akses Ditolak</h1>
          <p style={{ color: 'var(--text-muted)' }}>{cashier.error}</p>
        </div>
      </div>
    )
  }

  const receiptRequired = cashier.stores?.receipt_required !== undefined ? cashier.stores.receipt_required : true
  const requireSubProduct = cashier.stores?.require_sub_product ?? false
  const requireCustomerName = cashier.stores?.require_customer_name ?? false

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
      <header style={{ textAlign: 'center', margin: '2rem 0', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '-1rem', right: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem',
          fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '99px',
          backgroundColor: isOnline ? '#dcfce7' : '#fee2e2', color: isOnline ? '#15803d' : '#b91c1c',
          border: `1px solid ${isOnline ? '#bbf7d0' : '#fecaca'}`
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isOnline ? '#22c55e' : '#ef4444', display: 'inline-block' }}></span>
          {isOnline ? 'Online' : 'Offline Mode'}
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{cashier.stores?.name}</h1>
        <p style={{ color: 'var(--text-muted)' }}>Halo, {cashier.name || 'Kasir'}</p>
      </header>

      <main className="container animate-fade-in" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Lapor Transaksi</h2>
          <CashierForm
            cashierId={cashier.id}
            storeId={cashier.store_id}
            token={token}
            products={cashier.products}
            receiptRequired={receiptRequired}
            discountPercent={discountPercent}
            customerName={customerConfirmed ? customerName : ''}
            customerPhone={customerConfirmed ? customerPhone : ''}
            requireSubProduct={requireSubProduct}
            requireCustomerName={requireCustomerName}
          />
        </div>

        {cashier.stores?.subscription_tier === 'PRO' && cashier.stores?.pelanggan_enabled !== false && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem' }}>👥 Data Pelanggan</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Isi data pelanggan untuk mendapatkan potongan harga loyalitas</p>
            {!customerConfirmed && (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nama Pelanggan</label>
                  <input type="text" placeholder="Masukkan nama pelanggan" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.95rem' }} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nomor WhatsApp</label>
                  <input type="text" placeholder="08xxx..." value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} inputMode="numeric" style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.95rem' }} />
                </div>
                <button onClick={handleSaveCustomer} disabled={savingCustomer || !customerName || !customerPhone} style={{ width: '100%', padding: '0.625rem', backgroundColor: (savingCustomer || !customerName || !customerPhone) ? '#d1d5db' : 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>{savingCustomer ? 'Memeriksa...' : 'Cek & Simpan Pelanggan'}</button>
              </>
            )}
          </div>
        )}
      </main>

      <WaitingList storeId={cashier.store_id} token={token} />
    </div>
  )

  async function handleSaveCustomer() {
    if (!customerName || !customerPhone) { alert('Silakan isi nama dan nomor WhatsApp pelanggan'); return }
    setSavingCustomer(true)
    try {
      const res = await fetch('/api/pelanggan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, name: customerName, phone: customerPhone }) })
      const resData = await res.json()
      if (!res.ok) throw new Error(resData.error || 'Gagal menyimpan')
      setCustomerSaved(true); setCustomerConfirmed(true); setDiscountPercent(resData.discount_percent || 0); setDiscountMessage(resData.message || '')
    } catch (err) { alert('Gagal menyimpan: ' + err.message) } finally { setSavingCustomer(false) }
  }
}
