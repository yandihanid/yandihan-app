'use client'

import { useCallback, useEffect, useState } from 'react'
import { LogOut, WifiOff, Wifi } from 'lucide-react'
import CashierForm from './CashierForm'
import WaitingList from './WaitingList'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
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
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' && navigator.onLine)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
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
      await fetch('/api/cashier/logout', {
        method: 'POST',
        headers: {
          'x-cashier-token': token,
        },
      })
    } catch {
      // Tetap muat ulang: halaman berikutnya akan meminta login lagi.
    }
    try {
      localStorage.removeItem(PREFIX + token)
    } catch {}
    window.location.reload()
  }

  // Menu Antrean muncul kalau toko memakai mode antrean F&B ATAU fitur On the
  // Table. Pesanan meja selalu dibuat berstatus 'pending' supaya masuk antrean
  // kasir, jadi tanpa menu ini struk pesanan meja tidak bisa dicetak dari
  // layar kasir.
  const queueEnabled = store.waiting_list_enabled || store.on_table_enabled

  return (
    <div className="cashier-page">
      <header className="cashier-header">
        {store.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="cashier-logo" src={store.logo_url} alt={store.name} />
        )}
        <div className="cashier-header-text">
          <h1>{store.name}</h1>
          <p>
            Masuk sebagai <strong>{cashier.name}</strong>
          </p>
        </div>

        {/* Indikator online/offline */}
        <span
          className={`cashier-status ${isOnline ? 'online' : 'offline'}`}
          title={isOnline ? 'Online' : 'Offline — transaksi disimpan lokal'}
          aria-label={isOnline ? 'Status: Online' : 'Status: Offline'}
        >
          {isOnline ? <Wifi size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
          {isOnline ? ' Online' : ' Offline'}
        </span>

        <button
          type="button"
          className="btn btn-ghost btn-sm cashier-logout"
          onClick={() => setConfirmingLogout(true)}
          disabled={loggingOut}
        >
          <LogOut size={16} aria-hidden="true" />
          {loggingOut ? 'Keluar...' : 'Keluar'}
        </button>
      </header>

      <div className="cashier-kds-link">
        <a
          href={`/c/${token}/kds`}
          className="btn btn-ghost btn-sm"
        >
          👨‍🍳 Layar Dapur / KDS
        </a>

        <a
          href="/dashboard"
          className="btn btn-ghost btn-sm"
          title="Buka dashboard pemilik toko (butuh login owner)"
        >
          🏠 Dashboard Pemilik
        </a>
      </div>

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
          <WaitingList token={token} storeId={store.id} active={screen === 'queue'} />
        </main>
      )}

      <ConfirmDialog
        open={confirmingLogout}
        title="Yakin ingin keluar?"
        description={
          'Anda akan keluar dari layar kasir dan harus login kembali untuk ' +
          'mencatat transaksi. Transaksi yang belum tersinkronkan (offline) ' +
          'akan tetap tersimpan dan dikirim saat kembali online.'
        }
        confirmLabel="Ya, keluar"
        cancelLabel="Batal"
        variant="danger"
        busy={loggingOut}
        onConfirm={handleLogout}
        onClose={() => setConfirmingLogout(false)}
      />
    </div>
  )
}
