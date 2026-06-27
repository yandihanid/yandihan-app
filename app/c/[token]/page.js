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
          <CashierForm cashierId={cashier.id} storeId={cashier.store_id} token={token} products={cashier.products} />
        </div>
      </main>
    </div>
  )
}
