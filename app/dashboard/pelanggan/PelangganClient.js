'use client'

import { useState, useEffect } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Money from '@/components/ui/Money'
import { useToast } from '@/components/ui/Toast'

/**
 * Isi halaman /dashboard/pelanggan.
 *
 * `store` datang sebagai prop dari page.js, bukan lagi dari fetch('/api/store/my')
 * di useEffect. Daftar pelanggan tetap di-fetch dari client karena hanya relevan
 * untuk PRO dan belum dipakai untuk render awal.
 *
 * Sekarang juga menampilkan manajemen promo (nama, produk, tipe diskon, batas pakai).
 */

export default function PelangganClient({ store: initialStore }) {
  const toast = useToast()
  const [store, setStore] = useState(initialStore)
  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [pelangganEnabled, setPelangganEnabled] = useState(!!initialStore.pelanggan_enabled)
  const [visitThreshold, setVisitThreshold] = useState(initialStore.visit_threshold ?? 5)
  const [discountPercent, setDiscountPercent] = useState(initialStore.discount_percent ?? 10)
  const [savingToggle, setSavingToggle] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [error, setError] = useState('')

  // Promo state
  const [promos, setPromos] = useState([])
  const [promosLoading, setPromosLoading] = useState(false)
  const [showPromoForm, setShowPromoForm] = useState(false)
  const [savingPromo, setSavingPromo] = useState(false)
  const [editingPromo, setEditingPromo] = useState(null)
  const [promoName, setPromoName] = useState('')
  const [promoDescription, setPromoDescription] = useState('')
  const [promoType, setPromoType] = useState('fixed_price')
  const [promoValue, setPromoValue] = useState('')
  const [promoProductIds, setPromoProductIds] = useState([])
  const [promoUsageLimit, setPromoUsageLimit] = useState('')
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)

  useEffect(() => {
    if (store.plan !== 'pro') return
    let cancelled = false

    async function loadCustomers() {
      setCustomersLoading(true)
      try {
        const res = await fetch(`/api/pelanggan?storeId=${store.id}`)
        if (!res.ok) throw new Error('Gagal memuat daftar pelanggan')
        const list = await res.json()
        if (!cancelled) setCustomers(list)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setCustomersLoading(false)
      }
    }

    loadCustomers()

    return () => {
      cancelled = true
    }
  }, [store.id, store.plan])

  // Load promos
  useEffect(() => {
    if (store.plan !== 'pro') return
    let cancelled = false

    async function loadPromos() {
      setPromosLoading(true)
      try {
        const res = await fetch(`/api/promos?storeId=${store.id}`)
        if (!res.ok) throw new Error('Gagal memuat daftar promo')
        const data = await res.json()
        if (!cancelled) setPromos(data.promos || [])
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setPromosLoading(false)
      }
    }

    loadPromos()

    return () => {
      cancelled = true
    }
  }, [store.id, store.plan])

  // Load products for promo selection
  useEffect(() => {
    if (store.plan !== 'pro') return
    let cancelled = false

    async function loadProducts() {
      setProductsLoading(true)
      try {
        const res = await fetch(`/api/products?storeId=${store.id}`)
        if (!res.ok) throw new Error('Gagal memuat daftar produk')
        const data = await res.json()
        if (!cancelled) setProducts(data || [])
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setProductsLoading(false)
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [store.id, store.plan])

  const handleToggleEnabled = async () => {
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
      setStore((prev) => ({ ...prev, pelanggan_enabled: newValue }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingToggle(false)
    }
  }

  const handleSaveSettings = async () => {
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
      setStore((prev) => ({
        ...prev,
        visit_threshold: Number(visitThreshold),
        discount_percent: Number(discountPercent),
      }))
      toast.success('Pengaturan diskon tersimpan.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  // --- Promo handlers ---
  const resetPromoForm = () => {
    setPromoName('')
    setPromoDescription('')
    setPromoType('fixed_price')
    setPromoValue('')
    setPromoProductIds([])
    setPromoUsageLimit('')
    setEditingPromo(null)
    setShowPromoForm(false)
  }

  const handleSavePromo = async () => {
    if (!promoName.trim()) {
      toast.error('Nama promo wajib diisi')
      return
    }
    if (promoProductIds.length === 0) {
      toast.error('Minimal 1 produk harus dipilih')
      return
    }
    if (promoValue === '' || Number(promoValue) < 0) {
      toast.error('Nilai promo tidak valid')
      return
    }
    if (promoType === 'percent_discount' && Number(promoValue) > 100) {
      toast.error('Diskon persentase maksimal 100%')
      return
    }

    setSavingPromo(true)
    try {
      const url = editingPromo ? `/api/promos/${editingPromo.id}` : '/api/promos'
      const method = editingPromo ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          name: promoName,
          description: promoDescription,
          type: promoType,
          value: Number(promoValue),
          product_ids: promoProductIds,
          usage_limit_per_phone: promoUsageLimit ? Number(promoUsageLimit) : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menyimpan promo')
      }
      const data = await res.json()
      if (editingPromo) {
        setPromos((prev) => prev.map((p) => (p.id === editingPromo.id ? data.promo : p)))
        toast.success('Promo berhasil diperbarui.')
      } else {
        setPromos((prev) => [data.promo, ...prev])
        toast.success('Promo berhasil dibuat.')
      }
      resetPromoForm()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingPromo(false)
    }
  }

  const handleDeletePromo = async (promoId) => {
    if (!confirm('Hapus promo ini?')) return
    try {
      const res = await fetch(`/api/promos/${promoId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus promo')
      setPromos((prev) => prev.filter((p) => p.id !== promoId))
      toast.success('Promo dihapus.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleEditPromo = (promo) => {
    setEditingPromo(promo)
    setPromoName(promo.name || '')
    setPromoDescription(promo.description || '')
    setPromoType(promo.type || 'fixed_price')
    setPromoValue(String(promo.value || ''))
    setPromoProductIds(promo.product_ids || [])
    setPromoUsageLimit(promo.usage_limit_per_phone ? String(promo.usage_limit_per_phone) : '')
    setShowPromoForm(true)
  }

  const toggleProductInPromo = (productId) => {
    setPromoProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  if (store.plan !== 'pro') {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Menu Pelanggan
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Fitur ini hanya tersedia untuk <strong>Paket Pro</strong>. Silakan upgrade untuk mengakses loyalty customer.
        </p>
        <Button href="/pricing">Lihat Paket</Button>
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

      {error && (
        <Alert variant="error" style={{ marginBottom: '1rem' }}>
          {error}
        </Alert>
      )}

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
          aria-pressed={pelangganEnabled}
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
                htmlFor="visitThreshold"
                style={{
                  display: 'block',
                  marginBottom: '0.25rem',
                  color: 'var(--text-muted)',
                }}
              >
                Jumlah Kunjungan
              </label>
              <input
                id="visitThreshold"
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
                htmlFor="discountPercent"
                style={{
                  display: 'block',
                  marginBottom: '0.25rem',
                  color: 'var(--text-muted)',
                }}
              >
                Potongan Diskon (%)
              </label>
              <input
                id="discountPercent"
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem' }}>Nama</th>
                  <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem' }}>Nomor WA</th>
                  <th style={{ textAlign: 'center', padding: '0.625rem 0.75rem' }}>Kunjungan</th>
                  <th style={{ textAlign: 'right', padding: '0.625rem 0.75rem' }}>Total Belanja</th>
                  <th style={{ textAlign: 'center', padding: '0.625rem 0.75rem' }}>Diskon Aktif</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => {
                  const getsDiscount = cust.visit_count >= visitThreshold
                  return (
                    <tr
                      key={cust.id}
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                    >
                      <td style={{ padding: '0.625rem 0.75rem', fontWeight: '500' }}>{cust.name}</td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        <a
                          href={`https://wa.me/62${cust.phone.replace(/^0/, '').replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#16a34a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          💬 {cust.phone}
                        </a>
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          minWidth: '2rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          fontWeight: '700',
                          fontSize: '0.85rem'
                        }}>
                          {cust.visit_count ?? 0}x
                        </span>
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontWeight: '500' }}>
                        <Money value={cust.total_spent ?? 0} />
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                        {getsDiscount ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            backgroundColor: '#f0fdf4',
                            color: '#16a34a',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            border: '1px solid #86efac'
                          }}>
                            🏷️ {discountPercent}% OFF
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {`${visitThreshold - (cust.visit_count ?? 0)} lagi`}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Promo section */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontWeight: '600', fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>
          Promo Produk
        </h3>

        <button
          onClick={() => {
            resetPromoForm()
            setShowPromoForm(true)
          }}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: 'var(--primary-color)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
        >
          + Tambah Promo Baru
        </button>

        {showPromoForm && (
          <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
            <h4 style={{ fontWeight: '600', marginBottom: '1rem' }}>
              {editingPromo ? 'Edit Promo' : 'Buat Promo Baru'}
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Nama Promo
                </label>
                <input
                  type="text"
                  value={promoName}
                  onChange={(e) => setPromoName(e.target.value)}
                  placeholder="Contoh: Promo Kemerdekaan"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Deskripsi (opsional)
                </label>
                <textarea
                  value={promoDescription}
                  onChange={(e) => setPromoDescription(e.target.value)}
                  placeholder="Deskripsi promo..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Tipe Promo
                  </label>
                  <select
                    value={promoType}
                    onChange={(e) => setPromoType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <option value="fixed_price">Harga Fix (total promo)</option>
                    <option value="percent_discount">Diskon Persentase</option>
                  </select>
                </div>

                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {promoType === 'fixed_price' ? 'Harga Total Promo (Rp)' : 'Diskon (%)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={promoValue}
                    onChange={(e) => setPromoValue(e.target.value)}
                    placeholder={promoType === 'fixed_price' ? 'Contoh: 50000' : 'Contoh: 20'}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Produk yang Dipromokan (pilih minimal 1)
                </label>
                {productsLoading && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Memuat produk...</p>
                )}
                {!productsLoading && products.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Belum ada produk.</p>
                )}
                {!productsLoading && products.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {products.map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => toggleProductInPromo(prod.id)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '999px',
                          border: promoProductIds.includes(prod.id)
                            ? '2px solid var(--primary-color)'
                            : '1px solid var(--border-color)',
                          backgroundColor: promoProductIds.includes(prod.id)
                            ? 'var(--secondary-color)'
                            : 'var(--card-bg)',
                          color: promoProductIds.includes(prod.id)
                            ? 'var(--primary-color)'
                            : 'var(--text-main)',
                          fontWeight: promoProductIds.includes(prod.id) ? '700' : '400',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        {prod.name} ({new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(prod.price)})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Batas Penggunaan per Nomor Telepon (kosongkan = unlimited)
                </label>
                <input
                  type="number"
                  min="1"
                  value={promoUsageLimit}
                  onChange={(e) => setPromoUsageLimit(e.target.value)}
                  placeholder="Contoh: 3"
                  style={{
                    width: '200px',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                  }}
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Jika diisi, nomor telepon wajib diinput di kasir saat menggunakan promo.
                </small>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={handleSavePromo}
                  disabled={savingPromo}
                  style={{
                    padding: '0.5rem 1.5rem',
                    backgroundColor: savingPromo ? 'var(--border-color)' : 'var(--primary-color)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: savingPromo ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingPromo ? 'Menyimpan...' : (editingPromo ? 'Update Promo' : 'Buat Promo')}
                </button>
                <button
                  onClick={resetPromoForm}
                  style={{
                    padding: '0.5rem 1.5rem',
                    backgroundColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Promo list */}
        {promosLoading && (
          <p style={{ color: 'var(--text-muted)' }}>Memuat promo...</p>
        )}
        {!promosLoading && promos.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>Belum ada promo. Klik "Tambah Promo Baru" untuk membuat.</p>
        )}
        {!promosLoading && promos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {promos.map((promo) => (
              <div
                key={promo.id}
                className="card"
                style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}
              >
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <strong style={{ fontSize: '1.05rem' }}>{promo.name}</strong>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: promo.is_active ? '#dcfce7' : '#fee2e2',
                        color: promo.is_active ? '#15803d' : '#b91c1c',
                        fontWeight: '700',
                      }}
                    >
                      {promo.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  {promo.description && (
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {promo.description}
                    </p>
                  )}
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    <div><strong>Tipe:</strong> {promo.type === 'fixed_price' ? 'Harga Fix' : 'Diskon Persentase'}</div>
                    <div><strong>Nilai:</strong> {promo.type === 'fixed_price'
                      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(promo.value)
                      : `${promo.value}%`}</div>
                    <div><strong>Produk:</strong> {promo.product_ids?.length || 0} produk</div>
                    <div><strong>Batas per HP:</strong> {promo.usage_limit_per_phone ? `${promo.usage_limit_per_phone}x` : 'Unlimited'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => handleEditPromo(promo)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      backgroundColor: 'var(--secondary-color)',
                      color: 'var(--primary-color)',
                      border: '1px solid var(--primary-color)',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePromo(promo.id)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}