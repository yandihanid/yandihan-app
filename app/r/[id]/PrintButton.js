'use client'

import { useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'

const PREFIX = 'yandihan_cashier_meta_'

// Token TIDAK lagi dikirim dari server (temuan A4: halaman struk ini publik dan
// dulu menyertakan cashiers.token di HTML, sehingga setiap pembeli yang membuka
// struknya mendapat kredensial POS permanen). Perangkat kasir sudah menyimpan
// metanya sendiri saat membuka /c/<token>, jadi tombol "Kembali ke Kasir" hanya
// muncul di perangkat itu.
//
// useSyncExternalStore, bukan useEffect + setState: nilainya dibaca dari
// localStorage (sumber di luar React) dan snapshot server-nya null, jadi tidak
// ada render berantai dan tidak ada hydration mismatch.
const subscribe = () => () => {}

function readCashierToken() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(PREFIX)) {
        const token = key.slice(PREFIX.length)
        if (token) return token
      }
    }
  } catch {
    // localStorage bisa diblokir (mode privat / iframe).
  }
  return null
}

const serverSnapshot = () => null

export default function PrintButton() {
  const router = useRouter()
  const cashierToken = useSyncExternalStore(subscribe, readCashierToken, serverSnapshot)

  return (
    <div
      className="no-print"
      style={{
        display: 'flex',
        gap: '1rem',
        marginTop: '2rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      {cashierToken && (
        <button
          type="button"
          onClick={() => router.push(`/c/${cashierToken}`)}
          style={{
            padding: '0.75rem 2rem',
            borderRadius: '99px',
            border: '2px solid var(--border-color)',
            backgroundColor: 'white',
            color: 'var(--text-main)',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          ← Kembali ke Kasir
        </button>
      )}
      <button
        type="button"
        className="btn btn-primary"
        style={{ padding: '0.75rem 2rem', borderRadius: '99px' }}
        onClick={() => window.print()}
      >
        🖨️ Cetak Struk
      </button>
    </div>
  )
}
