'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addCashier } from './actions'

export default function AddCashierForm({ storeId }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleAdd = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('storeId', storeId)
    formData.append('name', name)

    const result = await addCashier(formData)

    if (result.error) {
      setError(result.error)
    } else {
      setName('')
    }
    
    setLoading(false)
    router.refresh()
  }

  return (
    <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}
      <form onSubmit={handleAdd} className="flex gap-2 items-end">
        <div className="input-group" style={{ margin: 0, flex: 1 }}>
          <label style={{ fontSize: '0.85rem' }}>Tambah Kasir Manual (Untuk Link Web)</label>
          <input 
            type="text" 
            className="input-field" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            placeholder="Misal: Budi Shift Pagi"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Memproses...' : 'Tambah Kasir'}
        </button>
      </form>
    </div>
  )
}
