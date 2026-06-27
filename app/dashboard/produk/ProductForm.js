'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addProduct } from './actions'

export default function ProductForm({ storeId }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData()
    formData.append('storeId', storeId)
    formData.append('name', name)
    formData.append('price', price)

    await addProduct(formData)

    setName('')
    setPrice('')
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <div style={{ flex: '1', minWidth: '200px' }}>
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
      <div style={{ flex: '1', minWidth: '150px' }}>
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
      <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '52px', padding: '0 1.5rem' }}>
        {loading ? <div className="spinner-sm"></div> : '+ Tambah'}
      </button>
    </form>
  )
}
