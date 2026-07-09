// components/pricing/PricingCard.jsx
import { useState, useEffect } from 'react';

export default function PricingCard() {
  const proMonthlyPriceFormatted = 'Rp78.000';
  const [loading, setLoading] = useState(false);
  const [midtransScriptLoaded, setMidtransScriptLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute(
      'data-client-key',
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''
    );
    script.onload = () => setMidtransScriptLoaded(true);
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  async function handleProSubscription() {
    if (!midtransScriptLoaded) {
      alert('Sedang memuat sistem pembayaran…');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/create-pro-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Gagal membuat transaksi');
      const { token } = await res.json();
      window.snap.pay(token, {
        onSuccess: function () {
          alert(
            'Pembayaran berhasil! Akun Pro Anda sudah aktif. Silakan refresh halaman.'
          );
          // optionally reload / redirect
        },
        onPending: function () {
          alert('Pembayaran tertunda – segera selesaikan agar fitur Pro aktif.');
        },
        onError: function () {
          alert('Pembayaran gagal. Silakan coba lagi.');
        },
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '400px',
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <h2 style={{ margin: '0 0 0.5rem' }}>Paket Pro</h2>
      <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
        {proMonthlyPriceFormatted}
        <span
          style={{
            fontSize: '1rem',
            fontWeight: 'normal',
            color: '#666',
          }}
        >
          {' '}
          /bulan
        </span>
      </p>
      <ul
        style={{
          textAlign: 'left',
          margin: '1rem 0',
          paddingLeft: '1.2rem',
          lineHeight: '2',
        }}
      >
        <li>Semua fitur dasar</li>
        <li>Laporan tak terbatas</li>
        <li>Dukungan prioritas</li>
        <li>Hemat – hanya {proMonthlyPriceFormatted} per bulan</li>
      </ul>
      <button
        onClick={handleProSubscription}
        disabled={loading}
        style={{
          padding: '0.75rem 2rem',
          backgroundColor: loading ? '#94a3b8' : '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
        }}
      >
        {loading ? 'Memproses…' : 'Pilih Pro (Rp78.000/bulan)'}
      </button>
    </div>
  );
}
