'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import CashierForm from './CashierForm'
import WaitingList from './WaitingList'
import { loyaltyEnabled, DEFAULT_VISIT_THRESHOLD } from '@/lib/loyalty'

const PREFIX = 'yandihan_cashier_meta_'
const DEVICE_KEY = 'yandihan_device_id'

/** ID perangkat untuk device binding. Sebelumnya
 *  Math.random().toString(36).slice(2, 9) -- sekitar 36 bit dan bisa berulang.
 *  randomUUID() 122 bit acak kriptografis. */
function deviceId() {
  let id = null
  try {
    id = localStorage.getItem(DEVICE_KEY)
  } catch {
    return 'dev_unknown'
  }
  if (!id || id.length < 16) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12)
    try {
      localStorage.setItem(DEVICE_KEY, id)
    } catch {
      /* penyimpanan diblokir: binding tidak akan persist */
    }
  }
  return id
}

/** async supaya setState-nya jatuh setelah batas microtask, bukan sinkron di
 *  dalam body useEffect (render berantai -- dilarang react-hooks). */
async function readCachedCashier(token) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + token) || 'null')
  } catch {
    return null
  }
}

export default function CashierWeb() {
  const { token } = useParams()
  const [cashier, setCashier] = useState(null)
  const [loading, setLoading] = useState(true)

  // Indikator online/offline sekarang ada di dalam CashierForm (satu tempat,
  // bersama jumlah antrean yang belum terkirim), jadi header tidak perlu
  // menghitungnya lagi sendiri.

  // Registrasi service worker (PWA + mode offline kasir). Sebelumnya ada di
  // dalam CashierForm; dipindah ke sini supaya terdaftar satu kali per layar
  // kasir, tidak tergantung apakah form-nya sudah dirender.
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      const cached = await readCachedCashier(token)
      if (cancelled) return
      if (cached?.id) {
        setCashier(cached)
        setLoading(false)
      }
      try {
        // Token dikirim lewat header, bukan query string: `?token=` ikut
        // tercatat di log proxy, terkirim lewat Referer, dan jadi cache key
        // service worker.
        const res = await fetch('/api/cashier', {
          headers: { 'x-cashier-token': token, 'x-device-id': deviceId() },
          cache: 'no-store',
        })
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          setCashier(data)
          try {
            localStorage.setItem(PREFIX + token, JSON.stringify(data))
          } catch {
            /* penyimpanan penuh: mode offline tidak tersedia */
          }
        } else if (!cached?.id) {
          const body = await res.json().catch(() => null)
          setCashier({ error: body?.error || 'Link tidak valid' })
        }
      } catch {
        // Offline. Kalau ada cache perangkat, kasir tetap bisa bekerja; kalau
        // tidak, baru tampilkan pesan. Sebelumnya fetch yang gagal membuat
        // load() reject sehingga layar berhenti di 'Memuat...' selamanya.
        if (cancelled) return
        if (!cached?.id) setCashier({ error: 'Tidak ada koneksi. Coba lagi setelah online.' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [token])

  if (loading) return <p style={{ textAlign: 'center', marginTop: '4rem' }}>Memuat...</p>
  if (!cashier || cashier.error) {
    return (
      <p style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--danger-color)' }}>
        {cashier?.error || 'Link tidak valid'}
      </p>
    )
  }

  const store = cashier.stores || {}
  return (
    <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', minHeight: '100vh' }}>
      <header style={{ textAlign: 'center', margin: '1.5rem 0' }}>
        <h1 style={{ color: 'var(--primary-color)', margin: 0 }}>{store.name}</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>{cashier.name}</p>
      </header>
      <main style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card">
          {/* storeId, cashierId, dan discountPercent tidak lagi dikirim: server
              menurunkan semuanya dari token (temuan A1, C1, B6). */}
          <CashierForm
            token={token}
            products={cashier.products || []}
            receiptRequired={store.receipt_required ?? true}
            requireSubProduct={store.require_sub_product ?? false}
            requireCustomerName={store.require_customer_name ?? false}
            loyaltyEnabled={loyaltyEnabled(store)}
            visitThreshold={store.visit_threshold ?? DEFAULT_VISIT_THRESHOLD}
          />
        </div>
      </main>
      {store.waiting_list_enabled && <WaitingList token={token} />}
    </div>
  )
}
