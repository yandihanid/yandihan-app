'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { PRO_PRICE_IDR } from '@/lib/plan'
import { formatRupiah } from '@/lib/format'

// Harga dibaca dari PRO_PRICE_IDR, tidak lagi ditulis ulang di sini. Sebelumnya
// banner ini menjanjikan "Rp 189.000 / bulan" sementara app/api/payment/route.js
// menagih PRO_PRICE_IDR -- dua angka berbeda untuk satu produk, di layar yang
// justru dipakai orang untuk memutuskan membeli. Daftar fiturnya juga diperbaiki:
// "Device Binding" bukan pembeda PRO (pengikatan perangkat aktif di semua paket,
// app/api/cashier/route.js:59-70), dan "transaksi tanpa batas" sekarang berlaku
// di paket GRATIS juga.

// --- Order tertunda --------------------------------------------------------
// localStorage dijadikan SATU-SATUNYA sumber kebenaran untuk "ada pembayaran
// yang belum selesai", lalu dibaca lewat useSyncExternalStore -- pola yang sama
// dengan app/r/[id]/PrintButton.js.
//
// Sebelumnya nilainya dibaca di dalam useEffect lalu disalin ke useState. Itu
// menghasilkan dua sumber kebenaran untuk satu fakta, dan render kedua yang
// langsung menyusul render pertama (cascading render) yang ditandai
// react-hooks/set-state-in-effect sebagai error.
//
// Karena komponen ini juga MENULIS nilai itu, setiap penulisan memanggil emit()
// supaya pembacanya ikut diperbarui. Event `storage` ikut didengarkan agar tab
// lain yang menyelesaikan pembayaran (dan menghapus kuncinya) juga membuat
// banner di tab ini hilang.
const ORDER_KEY = 'yandihan_pending_order'
const STORE_KEY = 'yandihan_pending_store'
const SNAP_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''

const listeners = new Set()

function emitPendingOrderChange() {
  for (const notify of listeners) notify()
}

function subscribePendingOrder(onStoreChange) {
  listeners.add(onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

function savePendingOrder(orderId, storeId) {
  try {
    localStorage.setItem(ORDER_KEY, orderId)
    localStorage.setItem(STORE_KEY, storeId)
  } catch {
    // localStorage bisa diblokir (mode privat). Pembayarannya tetap jalan;
    // yang hilang hanya tombol "Cek Status" setelah halaman dimuat ulang.
  }
  emitPendingOrderChange()
}

function clearPendingOrder() {
  try {
    localStorage.removeItem(ORDER_KEY)
    localStorage.removeItem(STORE_KEY)
  } catch {
    // Tidak ada yang bisa dilakukan, dan tidak ada yang perlu dilaporkan.
  }
  emitPendingOrderChange()
}

/** Snapshot di server selalu null: localStorage tidak ada di sana, dan
 *  mengembalikan null membuat markup server cocok dengan render pertama di
 *  browser sebelum store terbaca. */
const pendingOrderServerSnapshot = () => null

export default function UpgradeBanner({ storeId, subscriptionTier, subscriptionEndDate, midtransProduction = false }) {
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)
  const snapScriptUrl = midtransProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js'

  // Order tertunda hanya dianggap milik toko yang sedang dibuka -- pemilik
  // dengan beberapa toko tidak boleh melihat tombol "Cek Status" toko lain.
  const readPendingOrder = useCallback(() => {
    try {
      if (localStorage.getItem(STORE_KEY) !== storeId) return null
      return localStorage.getItem(ORDER_KEY)
    } catch {
      return null
    }
  }, [storeId])

  const pendingOrderId = useSyncExternalStore(
    subscribePendingOrder,
    readPendingOrder,
    pendingOrderServerSnapshot
  )

  // Snap browser harus memakai lingkungan yang sama dengan API server. URL
  // diturunkan dari MIDTRANS_IS_PRODUCTION di Server Component, sedangkan
  // client key memang variabel publik karena dibaca Snap.js di browser.
  useEffect(() => {
    if (!SNAP_CLIENT_KEY) return

    const existing = document.querySelector(`script[src="${snapScriptUrl}"]`)
    if (existing) return

    const script = document.createElement('script')
    script.src = snapScriptUrl
    script.setAttribute('data-client-key', SNAP_CLIENT_KEY)
    script.async = true
    script.onerror = () => {
      setStatusMsg({ type: 'error', text: 'Sistem pembayaran gagal dimuat. Muat ulang halaman lalu coba lagi.' })
    }
    document.body.appendChild(script)

    return () => {
      script.onerror = null
    }
  }, [snapScriptUrl])

  // Verify payment status from Midtrans directly
  const verifyPayment = async (orderId) => {
    setLoading(true)
    setStatusMsg(null)
    try {
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
      const data = await res.json()

      if (data.paid) {
        clearPendingOrder()
        setStatusMsg({ type: 'success', text: '✅ Pembayaran terkonfirmasi! Halaman akan diperbarui...' })
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setStatusMsg({ 
          type: 'warn', 
          text: `⏳ Pembayaran belum terkonfirmasi (status: ${data.status || 'unknown'}). Jika sudah bayar, tunggu beberapa saat lalu coba lagi.`
        })
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Gagal memverifikasi. Coba lagi.' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    if (!SNAP_CLIENT_KEY) {
      setStatusMsg({ type: 'error', text: 'Pembayaran belum dikonfigurasi. Hubungi pengelola aplikasi.' })
      return
    }
    if (!window.snap?.pay) {
      setStatusMsg({ type: 'warn', text: 'Sistem pembayaran masih dimuat. Tunggu sebentar lalu coba lagi.' })
      return
    }

    setLoading(true)
    setStatusMsg(null)
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId })
      })

      const data = await res.json()

      if (!res.ok || !data.token) {
        setStatusMsg({ type: 'error', text: data.error || 'Gagal membuat transaksi. Coba lagi.' })
        return
      }

      // Store orderId for fallback verify
      if (data.orderId) {
        savePendingOrder(data.orderId, storeId)
      }

      window.snap.pay(data.token, {
        onSuccess: async function() {
          setStatusMsg({ type: 'success', text: '✅ Pembayaran berhasil! Memverifikasi status...' })
          // Directly verify and upgrade
          if (data.orderId) {
            await verifyPayment(data.orderId)
          } else {
            setTimeout(() => window.location.reload(), 1500)
          }
        },
        onPending: function() {
          setStatusMsg({ type: 'warn', text: '⏳ Pembayaran Anda masih dalam proses. Selesaikan pembayaran dan klik "Cek Status Pembayaran" di bawah.' })
        },
        onError: function() {
          setStatusMsg({ type: 'error', text: '❌ Pembayaran gagal. Silakan coba lagi.' })
        },
        onClose: function() {
          setStatusMsg({ type: 'warn', text: '💡 Popup pembayaran ditutup. Jika sudah bayar, klik "Cek Status Pembayaran" di bawah.' })
        }
      })
    } catch (error) {
      console.error('Gagal membuka pembayaran', { message: error?.message })
      setStatusMsg({ type: 'error', text: 'Terjadi kesalahan saat membuka pembayaran. Coba lagi.' })
    } finally {
      setLoading(false)
    }
  }

  // === PRO tier: show expiry info instead ===
  if (subscriptionTier !== 'FREE') {
    if (!subscriptionEndDate) return null
    const expiry = new Date(subscriptionEndDate)
    const now = new Date()
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
    const isExpiringSoon = daysLeft <= 7

    return (
      <div style={{
        padding: '1rem 1.5rem',
        backgroundColor: isExpiringSoon ? '#fef3c7' : '#f0fdf4',
        borderRadius: '12px',
        border: `1px solid ${isExpiringSoon ? '#fcd34d' : '#86efac'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{isExpiringSoon ? '⚠️' : '✨'}</span>
          <div>
            <p style={{ margin: 0, fontWeight: '700', color: isExpiringSoon ? '#92400e' : '#15803d' }}>
              Paket PRO Aktif
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: isExpiringSoon ? '#b45309' : '#166534' }}>
              Berlaku hingga: <strong>{expiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              {' '}({daysLeft > 0 ? `${daysLeft} hari lagi` : 'Sudah berakhir'})
            </p>
          </div>
        </div>
        {isExpiringSoon && (
          <button
            onClick={handleUpgrade}
            disabled={loading}
            style={{
              backgroundColor: '#d97706',
              color: 'white',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '99px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {loading ? '...' : 'Perpanjang PRO'}
          </button>
        )}
      </div>
    )
  }

  // === FREE tier: show upgrade banner ===
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Status message */}
      {statusMsg && (
        <div style={{
          padding: '0.875rem 1rem',
          borderRadius: '10px',
          backgroundColor: statusMsg.type === 'success' ? '#dcfce7' : statusMsg.type === 'error' ? '#fee2e2' : '#fef3c7',
          color: statusMsg.type === 'success' ? '#15803d' : statusMsg.type === 'error' ? '#b91c1c' : '#92400e',
          fontSize: '0.9rem',
          fontWeight: '500'
        }}>
          {statusMsg.text}
        </div>
      )}

      {/* Pending order reminder */}
      {pendingOrderId && subscriptionTier === 'FREE' && (
        <div style={{
          padding: '0.875rem 1rem',
          borderRadius: '10px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fcd34d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: '700', color: '#92400e', fontSize: '0.9rem' }}>
              ⏳ Ada pembayaran yang belum selesai
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#b45309' }}>
              Jika Anda sudah membayar, klik tombol &quot;Cek Status&quot; untuk mengaktifkan PRO.
            </p>
          </div>
          <button
            onClick={() => verifyPayment(pendingOrderId)}
            disabled={loading}
            style={{
              backgroundColor: '#d97706',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '99px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap'
            }}
          >
            {loading ? '...' : '🔍 Cek Status'}
          </button>
        </div>
      )}

      {/* Main upgrade banner */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: 'var(--primary-color)',
        color: 'white',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '150px', height: '150px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(20px)' }}></div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, position: 'relative', zIndex: 10 }}>
          Upgrade ke Yandihan PRO ✨
        </h3>
        <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9, position: 'relative', zIndex: 10, maxWidth: '600px', lineHeight: 1.6 }}>
          Kasir tanpa batas, program loyalitas pelanggan, dan laporan lanjutan. Hanya{' '}
          <strong>{formatRupiah(PRO_PRICE_IDR)} / bulan</strong>, tanpa penagihan otomatis.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            style={{
              backgroundColor: 'var(--secondary-color)',
              color: 'var(--primary-color)',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '99px',
              fontWeight: '700',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.95rem'
            }}
          >
            {loading ? <span style={{ opacity: 0.7 }}>Memproses...</span> : '🚀 Beli Paket PRO'}
          </button>
        </div>
      </div>
    </div>
  )
}
