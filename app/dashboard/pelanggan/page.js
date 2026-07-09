'use client'

import { useState, useEffect } from 'react'

export default function PelangganPage() {
  const [store, setStore] = useState(null)
  const [storeLoading, setStoreLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [pelangganEnabled, setPelangganEnabled] = useState(false)
  const [visitThreshold, setVisitThreshold] = useState(5)
  const [discountPercent, setDiscountPercent] = useState(10)
  const [savingToggle, setSavingToggle] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStore() {
      try {
        // Expected response: { id, name, plan, pelanggan_enabled, visit_threshold, discount_percent }
        const res = await fetch('/api/store/my')
        if (!res.ok) throw new Error('Gagal memuat data toko')
        const data = await res.json()
        setStore(data)
        setPelangganEnabled(!!data.pelanggan_enabled)
        setVisitThreshold(data.visit_threshold ?? 5)
        setDiscountPercent(data.discount_percent ?? 10)
      } catch (err) {
        setError(err.message)
      } finally {
        setStoreLoading(false)
      }
    }
    loadStore()
  }, [])

  useEffect(() => {
    if (!store) return
    if (store.plan !== 'pro') return
    async function loadCustomers() {
      setCustomersLoading(true)
      try {
        const res = await fetch(`/api/pelanggan?storeId=${store.id}`)
        if (!res.ok) throw new Error('Gagal memuat daftar pelanggan')
        const list = await res.json()
        setCustomers(list)
      } catch (err) {
        setError(err.message)
      } finally {
        setCustomersLoading(false)
      }
    }
    loadCustomers()
  }, [store])

  const handleToggleEnabled = async () => {
    if (!store) return
    setSavingToggle(true)
    try {
      const newValue = !pelangganEnabled
      const res = await fetch('/api/pelanggan/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          pelanggan_enabled: newValue,
        }),
      })
      if (!res.ok) throw new Error('Gagal mengubah pengaturan')
      setPelangganEnabled(newValue)
    } catch (err) {
      alert('Gagal: ' + err.message)
    } finally {
      setSavingToggle(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!store) return
    setSavingSettings(true)
    try {
      const res = await fetch('/api/pelanggan/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          visit_threshold: Number(visitThreshold),
          discount_percent: Number(discountPercent),
        }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan pengaturan')
      alert('Pengaturan diskon tersimpan')
    } catch (err) {
      alert('Gagal: ' + err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  if (storeLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Memuat data toko...
      </div>
    )
  }

  if (error && !store) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <p>{error}</p>
      </div>
    )
  }

  if (store && store.plan !== 'pro') {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Menu Pelanggan
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Fitur ini hanya tersedia untuk <strong>Paket Pro</strong>. Silakan upgrade untuk mengakses loyalty customer.
        </p>
        <button
          onClick={() => { window.location.href = '/pricing' }}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: 'var(--primary-color)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Lihat Paket
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2
        style={{
          fontWeight: 'bold',
          fontSize: '1.5rem',
          color: 'var(--primary-color)',
          marginBottom: '1.5rem',
        }}
      >
        Menu Pelanggan
      </h2>

      {/* Toggle feature */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
        }}
      >
        <span style={{ fontWeight: '600', fontSize: '1rem' }}>
          Aktifkan Fitur Pelanggan
        </span>
        <button
          onClick={handleToggleEnabled}
          disabled={savingToggle}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '999px',
            border: 'none',
            backgroundColor: pelangganEnabled ? '#22c55e' : '#d1d5db',
            color: '#fff',
            fontWeight: 'bold',
            cursor: savingToggle ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {pelangganEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Loyalty settings */}
      {pelangganEnabled && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>
            Aturan Diskon Loyalitas
          </h3>
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
            }}
          >
            <div style={{ flex: '1 1 200px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.25rem',
                  color: 'var(--text-muted)',
                }}
              >
                Jumlah Kunjungan
              </label>
              <input
                type="number"
                min="1"
                value={visitThreshold}
                onChange={(e) => setVisitThreshold(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                }}
              />
              <small style={{ color: 'var(--text-muted)' }}>
                Berapa kali kunjungan untuk mendapat diskon
              </small>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.25rem',
                  color: 'var(--text-muted)',
                }}
              >
                Potongan Diskon (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                }}
              />
              <small style={{ color: 'var(--text-muted)' }}>
                Persentase potongan setelah memenuhi kunjungan
              </small>
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: savingSettings
                ? 'var(--border-color)'
                : 'var(--primary-color)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: savingSettings ? 'not-allowed' : 'pointer',
            }}
          >
            {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      )}

      {/* Customer list */}
      {pelangganEnabled && (
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>
            Daftar Pelanggan
          </h3>
          {customersLoading && (
            <p style={{ color: 'var(--text-muted)' }}>
              Memuat daftar pelanggan...
            </p>
          )}
          {!customersLoading && customers.length === 0 && (
            <p style={{ color: 'var(--text-muted)' }}>
              Belum ada pelanggan tercatat.
            </p>
          )}
          {!customersLoading && customers.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Nama</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>
                    Nomor WA
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>
                    Kunjungan
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => (
                  <tr
                    key={cust.id}
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                  >
                    <td style={{ padding: '0.5rem' }}>{cust.name}</td>
                    <td style={{ padding: '0.5rem' }}>{cust.phone}</td>
                    <td style={{ padding: '0.5rem' }}>
                      {cust.visit_count ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
