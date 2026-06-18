'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsForm({ store, userId }) {
  const [name, setName] = useState(store?.name || '')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (store) {
      // Update
      await supabase
        .from('stores')
        .update({ name })
        .eq('id', store.id)
    } else {
      // Insert new
      const uniqueCode = 'KASIR-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      await supabase
        .from('stores')
        .insert({ user_id: userId, name, unique_code: uniqueCode })
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="input-group">
        <label>Nama Toko</label>
        <input 
          type="text" 
          className="input-field" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          required 
          placeholder="Misal: Toko Yandihan Jaya"
        />
      </div>
      
      {store && (
        <div className="input-group">
          <label>Kode Unik Bot (Berikan ini ke Kasir Anda)</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input 
              type="text" 
              className="input-field" 
              value={store.unique_code} 
              readOnly 
              style={{ backgroundColor: '#f9fafb', fontWeight: 'bold', color: 'var(--primary-color)' }}
            />
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Kasir harus chat ke Bot Telegram dengan format: <strong>/start {store.unique_code}</strong>
          </p>
        </div>
      )}

      <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={loading}>
        {loading ? 'Menyimpan...' : 'Simpan Profil'}
      </button>
    </form>
  )
}
