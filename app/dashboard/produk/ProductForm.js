'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addProduct } from './actions'

export default function ProductForm({ storeId }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')

  // additional settings
  const [selfOrderEnabled, setSelfOrderEnabled] = useState(false)
  const [loyaltyPoints, setLoyaltyPoints] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData()
    formData.append('storeId', storeId)
    formData.append('name', name)
    formData.append('price', price)
    formData.append('stock', stock)

    if (selfOrderEnabled) {
      formData.append('selfOrder', 'on')
    }

    if (loyaltyPoints) {
      formData.append('loyaltyPoints', loyaltyPoints)
    }

    const result = await addProduct(formData)

    setLoading(false)
    if (!result.error) {
      setName('')
      setPrice('')
      setStock('')
      setSelfOrderEnabled(false)
      setLoyaltyPoints('')
      router.refresh()
      router.replace('/dashboard/produk')
    } else {
      alert(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', flexDirection: 'column' }}>
      <div style={{ width: '100%', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '2', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Nama Produk</label>
          <input
            type="text"
            className="input-field"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Misal: Nasi Goreng Spesial"
            required
          />
        </div>
        <div style={{ flex: '1', minWidth: '120px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Harga (Rp)</label>
          <input
            type="number"
            className="input-field"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="Misal: 25000"
            required
            min="0"
          />
        </div>
        <div style={{ flex: '1', minWidth: '100px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Stok Awal</label>
          <input
            type="number"
            className="input-field"
            value={stock}
            onChange={e => setStock(e.target.value)}
            placeholder="Misal: 50"
            required
            min="0"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '52px', padding: '0 1.5rem' }}>
          {loading ? <div className="spinner-sm"></div> : '+ Tambah'}
        </button>
      </div>

      {/* Pengaturan Tambahan */}
      <div style={{ width: '100%', marginTop: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' }}>
        <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '600' }}>Pengaturan Tambahan</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
              <input
                type="checkbox"
                checked={selfOrderEnabled}
                onChange={(e) => setSelfOrderEnabled(e.target.checked)}
              />
              Tersedia untuk Self-Order
            </label>
          </div>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Poin Loyalitas per Item</label>
            <input
              type="number"
              className="input-field"
              value={loyaltyPoints}
              onChange={e => setLoyaltyPoints(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>
        </div>
      </div>
    </form>
  )
}
