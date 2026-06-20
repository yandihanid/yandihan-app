'use client'

import { useState, useEffect } from 'react'
import CashierForm from './CashierForm'
import { useParams } from 'next/navigation'

export default function CashierWeb() {
  const params = useParams()
  const token = params.token

  const [cashier, setCashier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/cashier?token=${token}`)
        if (!res.ok) {
          setError(true)
          setLoading(false)
          return
        }
        const data = await res.json()
        setCashier(data)
      } catch (e) {
        setError(true)
      }
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) {
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
          <CashierForm cashierId={cashier.id} storeId={cashier.store_id} token={token} />
        </div>
      </main>
    </div>
  )
}
