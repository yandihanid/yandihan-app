'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addProduct } from './actions'

export default function ProductForm({ storeId }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', stock: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData()
    fd.append('storeId', storeId)
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    const res = await addProduct(fd)
    setLoading(false)
    if (res.error) alert(res.error)
    else {
      setForm({ name: '', price: '', stock: '' })
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <div style={{ flex: 2, minWidth: 200 }}>
        <label style={labelStyle}>Nama Produk</label>
        <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nasi Goreng" required />
      </div>
      <div style={{ flex: 1, minWidth: 120 }}>
        <label style={labelStyle}>Harga (Rp)</label>
        <input type="number" className="input-field" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="25000" required min="0" />
      </div>
      <div style={{ flex: 1, minWidth: 100 }}>
        <label style={labelStyle}>Stok Awal</label>
        <input type="number" className="input-field" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="50" required min="0" />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 52, padding: '0 1.5rem' }}>
        {loading ? '...' : '+ Tambah'}
      </button>
    </form>
  )
}

const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }
