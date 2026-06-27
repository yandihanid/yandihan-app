'use client'

import { useState, useEffect } from 'react'

export default function UpgradeBanner({ storeId, subscriptionTier, subscriptionEndDate }) {
  const [loading, setLoading] = useState(false)
  const [pendingOrderId, setPendingOrderId] = useState(null)
  const [statusMsg, setStatusMsg] = useState(null)

  // Load Midtrans Snap Script
  useEffect(() => {
    const scriptUrl = 'https://app.sandbox.midtrans.com/snap/snap.js'
    const clientKey = 'SB-Mid-client-5CqF-xis4qMicQ-m'
    
    if (document.querySelector(`script[src="${scriptUrl}"]`)) return

    const script = document.createElement('script')
    script.src = scriptUrl
    script.setAttribute('data-client-key', clientKey)
    script.async = true
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) document.body.removeChild(script)
    }
  }, [])

  // Check if there's a pending order stored in localStorage
  useEffect(() => {
    const storedOrderId = localStorage.getItem('yandihan_pending_order')
    const storedStoreId = localStorage.getItem('yandihan_pending_store')
    if (storedOrderId && storedStoreId === storeId) {
      setPendingOrderId(storedOrderId)
    }
  }, [storeId])

  // Verify payment status from Midtrans directly
  const verifyPayment = async (orderId) => {
    setLoading(true)
    setStatusMsg(null)
    try {
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, storeId })
      })
      const data = await res.json()

      if (data.paid) {
        localStorage.removeItem('yandihan_pending_order')
        localStorage.removeItem('yandihan_pending_store')
        setStatusMsg({ type: 'success', text: '✅ Pembayaran terkonfirmasi! Halaman akan diperbarui...' })
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setStatusMsg({ 
          type: 'warn', 
          text: `⏳ Pembayaran belum terkonfirmasi (status: ${data.status || 'unknown'}). Jika sudah bayar, tunggu beberapa saat lalu coba lagi.`
        })
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Gagal memverifikasi. Coba lagi.' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    setLoading(true)
    setStatusMsg(null)
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId })
      })

      const data = await res.json()

      if (!data.token) {
        setStatusMsg({ type: 'error', text: 'Gagal membuat transaksi: ' + (data.error || 'Unknown error') })
        setLoading(false)
        return
      }

      // Store orderId for fallback verify
      if (data.orderId) {
        localStorage.setItem('yandihan_pending_order', data.orderId)
        localStorage.setItem('yandihan_pending_store', storeId)
        setPendingOrderId(data.orderId)
      }

      window.snap.pay(data.token, {
        onSuccess: async function(result) {
          setStatusMsg({ type: 'success', text: '✅ Pembayaran berhasil! Memverifikasi status...' })
          // Directly verify and upgrade
          if (data.orderId) {
            await verifyPayment(data.orderId)
          } else {
            setTimeout(() => window.location.reload(), 1500)
          }
        },
        onPending: function(result) {
          setStatusMsg({ type: 'warn', text: '⏳ Pembayaran Anda masih dalam proses. Selesaikan pembayaran dan klik "Cek Status Pembayaran" di bawah.' })
        },
        onError: function(result) {
          setStatusMsg({ type: 'error', text: '❌ Pembayaran gagal. Silakan coba lagi.' })
        },
        onClose: function() {
          setStatusMsg({ type: 'warn', text: '💡 Popup pembayaran ditutup. Jika sudah bayar, klik "Cek Status Pembayaran" di bawah.' })
        }
      })
    } catch (err) {
      console.error(err)
      setStatusMsg({ type: 'error', text: 'Terjadi kesalahan: ' + err.message })
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
              Jika Anda sudah membayar, klik tombol "Cek Status" untuk mengaktifkan PRO.
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
          Transaksi tanpa batas, jumlah kasir tak terbatas, dan fitur Device Binding. Hanya <strong>Rp 189.000 / bulan</strong>.
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
