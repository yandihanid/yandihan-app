'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import CashierForm from './CashierForm'
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

    // --- customer data ---
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [customerSaved, setCustomerSaved] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [discountMessage, setDiscountMessage] = useState('')
  const [customerConfirmed, setCustomerConfirmed] = useState(false)
  // ---------------------

  // Monitor online status for header indicator
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
    // #region agent log
    fetch('http://127.0.0.1:7449/ingest/967cd299-60b4-494c-a62c-d11cf5e270f9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5a0991'},body:JSON.stringify({sessionId:'5a0991',hypothesisId:'H4',location:'page.js:useLayoutEffect',message:'page cache restore',data:{token,hasCached:!!cached?.id,loading},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
        // Generate or get Device ID for binding
        let deviceId = localStorage.getItem('yandihan_device_id')
        if (!deviceId) {
          deviceId = 'dev_' + Math.random().toString(36).substr(2, 9)
          localStorage.setItem('yandihan_device_id', deviceId)
        }

        const res = await fetch(`/api/cashier?token=${token}&deviceId=${deviceId}`)
        if (cancelled) return

        if (!res.ok) {
          if (res.status === 403) {
             // Device mismatch error
             const errorData = await res.json()
             setCashier({ error: errorData.error }) // We'll handle this in the render
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

    return () => {
      cancelled = true
    }
  }, [token])

    const handleSaveCustomer = async () => {
    if (!customerName || !customerPhone) {
      alert('Silakan isi nama dan nomor WhatsApp pelanggan')
      return
    }
    setSavingCustomer(true)
    setDiscountMessage('')
    setDiscountPercent(0)
    setCustomerConfirmed(false)
    try {
      const res = await fetch('/api/pelanggan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: customerName,
          phone: customerPhone
        })
      })
      const resData = await res.json()
      if (!res.ok) {
        throw new Error(resData.error || resData.message || 'Gagal menyimpan')
      }
      setCustomerSaved(true)
      setCustomerConfirmed(true)
      setDiscountPercent(resData.discount_percent || 0)
      setDiscountMessage(resData.message || '')
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message)
    } finally {
      setSavingCustomer(false)
    }
  }

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

  // receiptRequired default to true if not set
  const receiptRequired = cashier.stores?.receipt_required !== undefined ? cashier.stores.receipt_required : true

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
      <header style={{ textAlign: 'center', margin: '2rem 0', position: 'relative' }}>
        {/* Connection Status Indicator */}
        <div style={{
          position: 'absolute',
          top: '-1rem',
          right: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          padding: '0.25rem 0.5rem',
          borderRadius: '99px',
          backgroundColor: isOnline ? '#dcfce7' : '#fee2e2',
          color: isOnline ? '#15803d' : '#b91c1c',
          border: `1px solid ${isOnline ? '#bbf7d0' : '#fecaca'}`
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isOnline ? '#22c55e' : '#ef4444',
            display: 'inline-block'
          }}></span>
          {isOnline ? 'Online' : 'Offline Mode'}
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
          {cashier.stores?.name}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Halo, {cashier.name || 'Kasir'}
          {isCapacitor && (
            <button 
              onClick={() => {
                if (confirm('Apakah Anda yakin ingin mengganti link kasir?')) {
                  window.location.href = 'http://localhost?reset=true';
                }
              }}
              style={{
                marginLeft: '0.5rem',
                padding: '0.2rem 0.5rem',
                fontSize: '0.75rem',
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                verticalAlign: 'middle'
              }}
            >
              🔄 Ganti Link
            </button>
          )}
        </p>
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
          />
        </div>

                { cashier.stores?.subscription_tier === 'PRO' && cashier.stores?.pelanggan_enabled !== false && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem' }}>👥 Data Pelanggan</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Isi data pelanggan untuk mendapatkan potongan harga loyalitas</p>

            {customerConfirmed && discountPercent > 0 && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.25rem' }}>🎉</span>
                <div>
                  <p style={{ margin: 0, fontWeight: '700', color: '#16a34a', fontSize: '0.95rem' }}>Diskon {discountPercent}% aktif!</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#15803d' }}>{discountMessage}</p>
                </div>
              </div>
            )}

            {customerConfirmed && discountPercent === 0 && (
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #93c5fd',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.25rem' }}>✅</span>
                <div>
                  <p style={{ margin: 0, fontWeight: '600', color: '#1d4ed8', fontSize: '0.9rem' }}>Pelanggan tercatat</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#1e40af' }}>{discountMessage}</p>
                </div>
              </div>
            )}

            {!customerConfirmed && (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nama Pelanggan</label>
                  <input
                    type="text"
                    placeholder="Masukkan nama pelanggan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nomor WhatsApp</label>
                  <input
                    type="text"
                    placeholder="08xxx..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    inputMode="numeric"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
                <button
                  onClick={handleSaveCustomer}
                  disabled={savingCustomer || !customerName || !customerPhone}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    backgroundColor: (savingCustomer || !customerName || !customerPhone) ? '#d1d5db' : 'var(--primary-color)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: (savingCustomer || !customerName || !customerPhone) ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  {savingCustomer ? 'Memeriksa...' : 'Cek & Simpan Pelanggan'}
                </button>
              </>
            )}

            {customerConfirmed && (
              <button
                onClick={() => {
                  setCustomerConfirmed(false)
                  setCustomerSaved(false)
                  setDiscountPercent(0)
                  setDiscountMessage('')
                  setCustomerName('')
                  setCustomerPhone('')
                }}
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '0.4rem',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Ganti Pelanggan
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
