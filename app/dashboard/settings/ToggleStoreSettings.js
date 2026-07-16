'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ToggleStoreSettings({ storeId, field, label, initial }) {
  const [isOn, setIsOn] = useState(initial)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    setSaving(true)
    const newValue = !isOn
    const res = await fetch('/api/settings/store', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, [field]: newValue }),
    })
    if (res.ok) {
      setIsOn(newValue)
      router.refresh()
    } else alert('Gagal menyimpan')
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0' }}>
      <span style={{ fontWeight: 500 }}>{label}:</span>
      <button onClick={toggle} disabled={saving} style={{ width: 48, height: 26, borderRadius: 13, border: 'none', background: isOn ? '#22c55e' : '#d1d5db', cursor: 'pointer', position: 'relative' }}>
        <span style={{ position: 'absolute', top: 2, left: isOn ? 24 : 2, width: 22, height: 22, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
      </button>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{isOn ? 'Aktif' : 'Nonaktif'}</span>
    </div>
  )
}
