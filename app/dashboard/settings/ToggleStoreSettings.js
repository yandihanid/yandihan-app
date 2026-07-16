'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ToggleStoreSettings({ storeId, field, label, initial }) {
  const [isOn, setIsOn] = useState(initial)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleToggle = async () => {
    setSaving(true)
    const newValue = !isOn
    try {
      const res = await fetch('/api/settings/store', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, [field]: newValue }),
      })
      if (res.ok) {
        setIsOn(newValue)
        router.refresh()
      } else {
        alert('Gagal menyimpan pengaturan.')
      }
    } catch {
      alert('Gagal menyimpan pengaturan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0' }}>
      <span style={{ fontWeight: '500' }}>{label}:</span>
      <button
        onClick={handleToggle}
        disabled={saving}
        style={{
          position: 'relative',
          width: '48px',
          height: '26px',
          borderRadius: '13px',
          border: 'none',
          backgroundColor: isOn ? '#22c55e' : '#d1d5db',
          cursor: 'pointer',
          padding: 0,
          transition: 'background-color 0.2s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: isOn ? '24px' : '2px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.2s',
          }}
        />
      </button>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        {isOn ? 'Aktif' : 'Nonaktif'}
      </span>
    </div>
  )
}
