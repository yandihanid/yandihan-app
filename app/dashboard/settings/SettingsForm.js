'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function SettingsForm({ store, userId }) {
  const [name, setName] = useState(store?.name || '')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    if (store) {
      await supabase.from('stores').update({ name }).eq('id', store.id)
    } else {
      await supabase.from('stores').insert({ name, user_id: userId })
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nama Toko</label>
        <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Toko" required />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 52, padding: '0 1.5rem' }}>
        {loading ? '...' : 'Simpan'}
      </button>
    </form>
  )
}
