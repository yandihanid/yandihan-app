'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function AddCashierForm({ storeId }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAdd = async (e) => {
    e.preventDefault()
    setLoading(true)

    await supabase
      .from('cashiers')
      .insert({ store_id: storeId, name })

    setName('')
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleAdd} className="flex gap-2 items-end" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
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
  )
}
