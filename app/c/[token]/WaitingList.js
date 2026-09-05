'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Dulu komponen ini memakai anon client langsung dari browser untuk membaca dan
// menulis tabel transactions, padahal halaman kasir tidak punya sesi Supabase.
// Setelah RLS aktif (0002_rls_policies.sql) query itu akan mengembalikan nol
// baris tanpa error. Sekarang semuanya lewat route handler ber-token, dan
// pembaruan memakai polling -- Realtime butuh JWT yang kasir memang tidak punya.

const POLL_MS = 15000

export default function WaitingList({ token }) {
  const [tickets, setTickets] = useState([])
  const [busyId, setBusyId] = useState(null)
  const inFlight = useRef(false)

  const load = useCallback(async () => {
    if (!token || inFlight.current) return
    inFlight.current = true
    try {
      const res = await fetch('/api/cashier/waiting-list', {
        headers: { 'x-cashier-token': token },
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json()
      setTickets(Array.isArray(data.tickets) ? data.tickets : [])
    } catch {
      // Offline: biarkan daftar terakhir tetap tampil.
    } finally {
      inFlight.current = false
    }
  }, [token])

  useEffect(() => {
    load()
    const timer = setInterval(load, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  const markDone = async (id) => {
    setBusyId(id)
    try {
      const res = await fetch('/api/cashier/waiting-list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-cashier-token': token },
        body: JSON.stringify({ id }),
      })
      if (res.ok) setTickets((prev) => prev.filter((t) => t.id !== id))
      else load()
    } catch {
      // Gagal kirim: biarkan tiket tetap di daftar supaya bisa dicoba lagi.
    } finally {
      setBusyId(null)
    }
  }

  if (!tickets.length) return null

  return (
    <section
      className="card"
      style={{ maxWidth: 500, margin: '1rem auto' }}
      aria-live="polite"
    >
      <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>
        Waiting List <span style={{ color: 'var(--text-muted)' }}>({tickets.length})</span>
      </h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {tickets.map((t) => (
          <li
            key={t.id}
            style={{
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: 8,
              padding: '0.75rem',
              marginBottom: '0.5rem',
            }}
          >
            <div style={{ fontWeight: 700 }}>{t.buyer_name || t.customer_name || 'Tanpa Nama'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.product_name}</div>
            <button
              type="button"
              onClick={() => markDone(t.id)}
              disabled={busyId === t.id}
              style={{
                marginTop: '0.5rem',
                minHeight: 44,
                padding: '0.5rem 1rem',
                background: busyId === t.id ? '#94a3b8' : '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              {busyId === t.id ? 'Menyimpan...' : 'Selesai / Panggil'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
