// components/pricing/PricingCard.jsx
import { PRO_MONTHLY_PRICE, PRO_MONTHLY_PRICE_FORMATTED } from '@/lib/pricingConstants';

export default function PricingCard() {
  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '12px',
      padding: '2rem',
      maxWidth: '400px',
      margin: '0 auto',
      textAlign: 'center',
    }}>
      <h2 style={{ margin: '0 0 0.5rem' }}>Paket Pro</h2>
      <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
        {PRO_MONTHLY_PRICE_FORMATTED}
        <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#666' }}> /bulan</span>
      </p>
      <ul style={{ textAlign: 'left', margin: '1rem 0', paddingLeft: '1.2rem', lineHeight: '2' }}>
        <li>Semua fitur dasar</li>
        <li>Laporan tak terbatas</li>
        <li>Dukungan prioritas</li>
        <li>Hemat – hanya {PRO_MONTHLY_PRICE_FORMATTED} per bulan</li>
      </ul>
      <button style={{
        padding: '0.75rem 2rem',
        backgroundColor: '#0070f3',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
      }}>
        Pilih Pro
      </button>
    </div>
  );
}
