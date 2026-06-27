'use client'

import { useRouter } from 'next/navigation'

export default function PrintButton({ cashierToken }) {
  const router = useRouter()

  return (
    <div className="no-print" style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      {cashierToken && (
        <button
          onClick={() => router.push(`/c/${cashierToken}`)}
          style={{
            padding: '0.75rem 2rem',
            borderRadius: '99px',
            border: '2px solid var(--border-color)',
            backgroundColor: 'white',
            color: 'var(--text-main)',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          ← Kembali ke Kasir
        </button>
      )}
      <button
        className="btn btn-primary"
        style={{ padding: '0.75rem 2rem', borderRadius: '99px' }}
        onClick={() => window.print()}
      >
        🖨️ Cetak Struk
      </button>
    </div>
  )
}
