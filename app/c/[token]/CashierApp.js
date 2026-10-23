'use client'

import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import CashierForm from './CashierForm'
import WaitingList from './WaitingList'
import { loyaltyEnabled, DEFAULT_VISIT_THRESHOLD } from '@/lib/loyalty'

const PREFIX = 'yandihan_cashier_meta_'

/**
 * Kerangka layar kasir setelah login.
 *
 * Data awal (toko, kasir, produk) datang dari Server Component, jadi tidak ada
 * layar "Memuat..." dan tidak ada request pertama yang bisa gagal. Salinan
 * metanya tetap ditulis ke localStorage untuk dua hal: tombol "Kembali ke
 * Kasir" di halaman struk, dan layar offline yang sudah terlanjur terbuka.
 */
export default function CashierApp({ token, cashier, store, products }) {
  const [screen, setScreen] = useState('transaction')
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        PREFIX + token,
        JSON.stringify({
          id: cashier.id,
          name: cashier.name,
          store_id: store.id,
          stores: store,
          products,
        })
      )
    } catch {
      // Penyimpanan penuh/diblokir: aplikasi tetap jalan, hanya meta offline
      // dan tombol kembali dari struk yang tidak tersedia.
    }
  }, [token, cashier, store, products])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await fetch('/api/cashier/logout', { method: 'POST' })
    } catch {
      // Tetap muat ulang: halaman berikutnya akan meminta login lagi.
    }
    try {
      localStorage.removeItem(PREFIX + token)
    } catch {}
    window.location.reload()
  }

  const queueEnabled = store.waiting_list_enabled

  return (
    <div className="cashier-page">
      <header className="cashier-header">
        <div className="cashier-header-text">
          <h1>{store.name}</h1>
          <p>
            Masuk sebagai <strong>{cashier.name}</strong>
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm cashier-logout"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut size={16} aria-hidden="true" />
          {loggingOut ? 'Keluar...' : 'Keluar'}
        </button>
      </header>

      {queueEnabled && (
        <nav className="cashier-nav" aria-label="Menu kasir">
          <button
            type="button"
            className={screen === 'transaction' ? 'active' : ''}
            onClick={() => setScreen('transaction')}
            aria-current={screen === 'transaction' ? 'page' : undefined}
          >
            Transaksi
          </button>
          <button
            type="button"
            className={screen === 'queue' ? 'active' : ''}
            onClick={() => setScreen('queue')}
            aria-current={screen === 'queue' ? 'page' : undefined}
          >
            Antrean
          </button>
        </nav>
      )}

      {screen === 'transaction' || !queueEnabled ? (
        <main className="cashier-main">
          <div className="card cashier-form-card">
            <CashierForm
              token={token}
              products={products}
              receiptRequired={store.receipt_required ?? true}
              requireCustomerName={store.require_customer_name ?? false}
              loyaltyEnabled={loyaltyEnabled(store)}
              visitThreshold={store.visit_threshold ?? DEFAULT_VISIT_THRESHOLD}
            />
          </div>
        </main>
      ) : (
        <main className="cashier-main">
          <WaitingList token={token} active={screen === 'queue'} />
        </main>
      )}
    </div>
  )
}
