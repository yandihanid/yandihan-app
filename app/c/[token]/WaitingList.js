'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatRupiah } from '@/lib/format'
import { wibTimeLabel } from '@/lib/time'
import { cashierDeviceHeaders } from './device'

const POLL_MS = 15000
const TABS = [
  { status: 'pending', label: 'Belum selesai' },
  { status: 'done', label: 'Selesai' },
]

export default function WaitingList({ token, active = true }) {
  const [status, setStatus] = useState('pending')
  const [snapshot, setSnapshot] = useState({
    status: 'pending',
    tickets: [],
    loaded: false,
  })
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const activeStatus = useRef(status)
  const requestSequence = useRef(0)
  const requestController = useRef(null)

  const cancelActiveLoad = useCallback(() => {
    requestSequence.current += 1
    requestController.current?.abort()
    requestController.current = null
  }, [])

  const load = useCallback(async () => {
    if (!active || !token || document.visibilityState !== 'visible') return

    const requestedStatus = activeStatus.current
    const sequence = requestSequence.current + 1
    const controller = new AbortController()
    requestSequence.current = sequence
    requestController.current?.abort()
    requestController.current = controller

    try {
      const res = await fetch(`/api/cashier/waiting-list?status=${requestedStatus}`, {
        headers: {
          'x-cashier-token': token,
          ...cashierDeviceHeaders(),
        },
        cache: 'no-store',
        signal: controller.signal,
      })
      const data = await res.json().catch(() => null)
      if (sequence !== requestSequence.current || requestedStatus !== activeStatus.current) return
      if (!res.ok) {
        setError(data?.error || 'Gagal memuat antrean.')
        return
      }
      setSnapshot({
        status: requestedStatus,
        tickets: Array.isArray(data?.tickets) ? data.tickets : [],
        loaded: true,
      })
      setError('')
    } catch (loadError) {
      if (
        loadError?.name !== 'AbortError'
        && sequence === requestSequence.current
        && requestedStatus === activeStatus.current
      ) {
        setError('Tidak ada koneksi. Daftar terakhir tetap ditampilkan.')
      }
    } finally {
      if (sequence === requestSequence.current) requestController.current = null
    }
  }, [active, token])

  useEffect(() => {
    if (!active) {
      cancelActiveLoad()
      return
    }
    const first = setTimeout(load, 0)
    const timer = setInterval(load, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      cancelActiveLoad()
    }
  }, [active, cancelActiveLoad, load, status])

  const selectStatus = (nextStatus) => {
    if (nextStatus === activeStatus.current) return
    activeStatus.current = nextStatus
    cancelActiveLoad()
    setStatus(nextStatus)
    setSnapshot({ status: nextStatus, tickets: [], loaded: false })
    setError('')
  }

  const markDone = async (id) => {
    if (!navigator.onLine) {
      setError('Perubahan status membutuhkan koneksi internet.')
      return
    }
    setBusyId(id)
    try {
      const res = await fetch('/api/cashier/waiting-list', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-cashier-token': token,
          ...cashierDeviceHeaders(),
        },
        body: JSON.stringify({ id }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || 'Gagal memperbarui antrean.')
        return
      }
      setError('')
      await load()
    } catch {
      setError('Koneksi terputus. Status antrean belum diubah.')
    } finally {
      setBusyId(null)
    }
  }

  const current = snapshot.status === status ? snapshot.tickets : []
  const currentLoaded = snapshot.status === status && snapshot.loaded

  return (
    <main className="queue-screen" aria-live="polite">
      <section className="card">
        <div className="queue-heading">
          <div>
            <h2>Antrean hari ini</h2>
            <p>Nomor antrean mengikuti hari operasional WIB.</p>
          </div>
          <button type="button" className="pos-text-btn" onClick={load}>
            Muat ulang
          </button>
        </div>

        <div className="queue-tabs" role="tablist" aria-label="Status antrean">
          {TABS.map((tab) => (
            <button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={status === tab.status}
              className={status === tab.status ? 'active' : ''}
              onClick={() => selectStatus(tab.status)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-warning">{error}</div>}

        {!currentLoaded && current.length === 0 ? (
          <div className="queue-empty">Memuat antrean...</div>
        ) : current.length === 0 ? (
          <div className="queue-empty">
            {status === 'pending' ? 'Tidak ada antrean yang belum selesai.' : 'Belum ada antrean selesai hari ini.'}
          </div>
        ) : (
          <ol className="queue-list">
            {current.map((ticket) => (
              <li key={ticket.id} className="queue-card">
                <div className="queue-number" aria-label={`Nomor antrean ${ticket.queue_number}`}>
                  <span>No.</span>
                  <strong>{ticket.queue_number ?? '-'}</strong>
                </div>
                <div className="queue-detail">
                  <strong>{ticket.buyer_name || ticket.customer_name || 'Tanpa nama'}</strong>
                  <span>{ticket.product_name || 'Pesanan'}</span>
                  <small>{wibTimeLabel(ticket.created_at)} · {formatRupiah(ticket.amount)}</small>
                </div>
                {status === 'pending' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => markDone(ticket.id)}
                    disabled={busyId === ticket.id}
                  >
                    {busyId === ticket.id ? 'Menyimpan...' : 'Tandai selesai'}
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}
