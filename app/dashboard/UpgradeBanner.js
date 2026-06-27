'use client'

import { useState, useEffect } from 'react'

export default function UpgradeBanner({ storeId, subscriptionTier }) {
  const [loading, setLoading] = useState(false)

  // Load Midtrans Snap Script
  useEffect(() => {
    const scriptUrl = 'https://app.sandbox.midtrans.com/snap/snap.js'
    const clientKey = 'SB-Mid-client-5CqF-xis4qMicQ-m' // Use env in real app
    
    if (document.querySelector(`script[src="${scriptUrl}"]`)) return;

    const script = document.createElement('script')
    script.src = scriptUrl
    script.setAttribute('data-client-key', clientKey)
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId })
      })

      const data = await res.json()

      if (data.token) {
        window.snap.pay(data.token, {
          onSuccess: function(result){
            alert('Pembayaran berhasil! Toko Anda sekarang versi PRO.')
            window.location.reload()
          },
          onPending: function(result){
            alert('Menunggu pembayaran Anda.')
          },
          onError: function(result){
            alert('Pembayaran gagal.')
          },
          onClose: function(){
            console.log('User closed the popup without finishing the payment')
          }
        })
      } else {
        alert('Gagal membuat transaksi: ' + data.error)
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  if (subscriptionTier !== 'FREE') return null

  return (
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
      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, position: 'relative', zIndex: 10 }}>Upgrade ke Yandihan PRO ✨</h3>
      <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9, position: 'relative', zIndex: 10, maxWidth: '600px', lineHeight: 1.6 }}>
        Nikmati transaksi tanpa batas, jumlah kasir tak terbatas, dan fitur Device Binding untuk keamanan ekstra. Hanya Rp 189.000 / bulan.
      </p>
      <div>
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
            gap: '0.5rem'
          }}
        >
          {loading ? <div className="spinner-sm" style={{ borderColor: 'var(--primary-color)', borderRightColor: 'transparent' }}></div> : 'Beli Paket PRO'}
        </button>
      </div>
    </div>
  )
}
