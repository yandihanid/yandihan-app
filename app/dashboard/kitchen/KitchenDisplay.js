'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatRupiah } from '@/lib/format'
import { wibTimeLabel } from '@/lib/time'
import styles from './kds.module.css'

const POLL_MS = 8000
const FRESH_MS = 3 * 60 * 1000

/**
 * Kitchen Display System.
 *
 * Semua data lewat /api/kitchen/orders (server menentukan store dari sesi
 * pemilik atau token kasir). Sebelumnya komponen ini memakai Supabase anon key
 * dari browser; di halaman kasir itu selalu kosong karena tidak ada sesi
 * Supabase dan RLS menolak.
 */
export default function KitchenDisplay({ storeId, storeName, token = null }) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const controllerRef = useRef(null)
  const sequenceRef = useRef(0)

  const load = useCallback(async () => {
    if (!storeId) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return

    const sequence = sequenceRef.current + 1
    sequenceRef.current = sequence
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    try {
      const headers = {}
      if (token) headers['x-cashier-token'] = token

      const res = await fetch(`/api/kitchen/orders?storeId=${encodeURIComponent(storeId)}`, {
        headers,
        cache: 'no-store',
        signal: controller.signal,
      })
      const data = await res.json().catch(() => null)

      if (sequence !== sequenceRef.current) return
      if (!res.ok) {
        setError(data?.error || 'Gagal memuat pesanan.')
        return
      }

      setTickets(Array.isArray(data?.tickets) ? data.tickets : [])
      setError('')
      setNow(Date.now())
    } catch (loadError) {
      if (loadError?.name !== 'AbortError' && sequence === sequenceRef.current) {
        setError('Tidak ada koneksi. Daftar terakhir tetap ditampilkan.')
      }
    } finally {
      if (sequence === sequenceRef.current) {
        controllerRef.current = null
        setLoading(false)
      }
    }
  }, [storeId, token])

  useEffect(() => {
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
      sequenceRef.current += 1
      controllerRef.current?.abort()
    }
  }, [load])

  const markDone = async (ticket) => {
    setBusyId(ticket.id)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['x-cashier-token'] = token

      const res = await fetch('/api/kitchen/orders', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ storeId, id: ticket.id }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error || 'Gagal memperbarui pesanan.')
        return
      }

      setTickets((prev) =>
        prev.map((row) => (row.id === ticket.id ? { ...row, kitchen_status: 'done' } : row))
      )
      setError('')
      await load()
    } catch {
      setError('Koneksi terputus. Pesanan belum ditandai selesai.')
    } finally {
      setBusyId(null)
    }
  }

  const pending = tickets
    .filter((ticket) => ticket.kitchen_status !== 'done')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  const done = tickets
    .filter((ticket) => ticket.kitchen_status === 'done')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)

  return (
    <main className={styles.screen}>
      <div className={styles.bar}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Dapur · {storeName}</h1>
          <p className={styles.subtitle}>Pesanan hari ini (WIB) · diperbarui otomatis</p>
        </div>
        <div className={styles.controls}>
          <span className={styles.countPill}>
            {pending.length} pesanan menunggu
          </span>
          <button type="button" className={styles.iconBtn} onClick={load}>
            Muat ulang
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBar}>{error}</div>}

      <div className={styles.board}>
        <section aria-label="Pesanan menunggu">
          <div className={styles.columnHead}>
            <h2 className={styles.columnTitle}>Sedang diproses</h2>
          </div>

          {loading && pending.length === 0 ? (
            <div className={styles.loading}>Memuat pesanan...</div>
          ) : pending.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon} aria-hidden="true">
                ✓
              </div>
              Semua pesanan sudah selesai.
            </div>
          ) : (
            <div className={styles.grid}>
              {pending.map((ticket) => {
                const isFresh = now - new Date(ticket.created_at).getTime() < FRESH_MS
                return (
                  <article
                    key={ticket.id}
                    className={`${styles.card}${isFresh ? ` ${styles.cardNew}` : ''}`}
                  >
                    <div className={styles.cardTop}>
                      <div className={styles.queue}>
                        <span className={styles.queueLabel}>No.</span>
                        <span className={styles.queueNumber}>
                          {ticket.queue_number ?? '—'}
                        </span>
                      </div>
                      {ticket.table_number ? (
                        <span className={styles.tableBadge}>Meja {ticket.table_number}</span>
                      ) : (
                        <span className={styles.tableBadge}>
                          {ticket.buyer_name || ticket.customer_name || 'Kasir'}
                        </span>
                      )}
                    </div>

                    <p className={styles.items}>
                      {ticket.product_name || 'Pesanan tanpa rincian'}
                    </p>

                    <div className={styles.meta}>
                      <span>
                        {wibTimeLabel(ticket.created_at)}
                        {ticket.payment_method ? ` · ${ticket.payment_method}` : ''}
                      </span>
                      <span className={styles.amount}>{formatRupiah(ticket.amount)}</span>
                    </div>

                    <button
                      type="button"
                      className={styles.doneBtn}
                      onClick={() => markDone(ticket)}
                      disabled={busyId === ticket.id}
                    >
                      {busyId === ticket.id ? 'Menyimpan...' : 'Selesai'}
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section aria-label="Pesanan selesai">
          <div className={styles.columnHead}>
            <h2 className={styles.columnTitle}>Baru selesai</h2>
          </div>

          {done.length === 0 ? (
            <div className={styles.empty}>Belum ada pesanan selesai hari ini.</div>
          ) : (
            <div className={styles.doneList}>
              {done.map((ticket) => (
                <div key={ticket.id} className={styles.doneRow}>
                  <div>
                    <strong>{ticket.queue_number ?? '—'}</strong>{' '}
                    {ticket.table_number ? `· Meja ${ticket.table_number}` : ''}
                  </div>
                  <span>
                    {ticket.product_name || 'Pesanan'} · {wibTimeLabel(ticket.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
