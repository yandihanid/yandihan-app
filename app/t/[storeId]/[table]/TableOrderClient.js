'use client'

import { useState } from 'react'
import { formatRupiah } from '@/lib/format'

export default function TableOrderClient({ store, tableNumber, products }) {
  const [cart, setCart] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mainProducts = products.filter((p) => !p.is_sub_product)

  const addToCart = (id) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }

  const removeFromCart = (id) => {
    setCart((prev) => {
      const next = { ...prev }
      if (next[id] > 1) next[id] -= 1
      else delete next[id]
      return next
    })
  }

  const items = Object.entries(cart).map(([productId, qty]) => ({ product_id: productId, qty }))
  const total = items.reduce((sum, item) => {
    const p = products.find((x) => x.id === item.product_id)
    return sum + (p ? Number(p.price) * item.qty : 0)
  }, 0)

  const checkout = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/on-the-table/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id, tableNumber, items }),
      })
      const data = await res.json()
      if (!res.ok || !data.invoiceUrl) {
        setError(data.error || 'Gagal membuat pembayaran')
        return
      }
      window.location.assign(data.invoiceUrl)
    } catch (e) {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: '1rem', maxWidth: 900, margin: '0 auto' }}>
      <h1>{store.name}</h1>
      <p>Meja {tableNumber}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {mainProducts.map((p) => (
          <div key={p.id} className="card" style={{ padding: '0.75rem' }}>
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <div style={{ width: '100%', height: 120, background: '#f1f5f9', borderRadius: 8 }} />
            )}
            <h3 style={{ fontSize: '1rem', margin: '0.5rem 0 0.25rem' }}>{p.name}</h3>
            <p style={{ margin: 0, fontWeight: 600 }}>{formatRupiah(p.price)}</p>
            <button onClick={() => addToCart(p.id)} style={{ marginTop: '0.5rem', width: '100%' }}>Tambah</button>
            {cart[p.id] ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <button onClick={() => removeFromCart(p.id)}>-</button>
                <span>{cart[p.id]}</span>
                <button onClick={() => addToCart(p.id)}>+</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem', position: 'sticky', bottom: 0 }}>
          <h3>Pesanan</h3>
          {items.map((item) => {
            const p = products.find((x) => x.id === item.product_id)
            return <div key={item.product_id}>{p?.name} x{item.qty}</div>
          })}
          <p style={{ fontWeight: 700 }}>Total: {formatRupiah(total)}</p>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button onClick={checkout} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Memproses...' : 'Bayar via Xendit'}
          </button>
        </div>
      )}
    </main>
  )
}
