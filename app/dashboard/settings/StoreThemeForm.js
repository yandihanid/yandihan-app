'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import Alert from '@/components/ui/Alert'
import { STORE_THEMES, normalizeTheme } from '@/lib/storeTheme'
import { updateStoreTheme } from './actions'

/**
 * Pilihan warna dasar toko.
 *
 * Warna yang dipilih dipakai di SELURUH halaman toko: dashboard, link kasir,
 * dan halaman pesan meja (On the Table). Karena itu pilihannya berupa kotak
 * warna -- yang dicari pemilik adalah warnanya, bukan namanya.
 *
 * Action dipanggil langsung (bukan lewat useActionState) karena setiap klik
 * pada kotak warna langsung menyimpan, bukan lewat tombol "Simpan" terpisah.
 * Pola yang sama dipakai ProductRow untuk ubah stok.
 */
export default function StoreThemeForm({ store }) {
  const router = useRouter()
  const [selected, setSelected] = useState(normalizeTheme(store?.theme_color))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const saveTheme = async (themeId) => {
    const previous = selected
    setSelected(themeId)
    setSaving(true)

    const formData = new FormData()
    formData.set('storeId', store?.id ?? '')
    formData.set('themeColor', themeId)

    const result = await updateStoreTheme(formData)
    setSaving(false)

    if (result?.error) {
      setSelected(previous)
      setMessage({ type: 'error', text: result.error })
      return
    }

    setMessage({ type: 'success', text: 'Warna toko tersimpan.' })
    router.refresh()
  }

  return (
    <div className="settings-form">
      {message?.type === 'error' && <Alert variant="error">{message.text}</Alert>}
      {message?.type === 'success' && <Alert variant="success">{message.text}</Alert>}

      <div className="theme-swatches" role="group" aria-label="Pilih warna toko">
        {STORE_THEMES.map((theme) => {
          const active = selected === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              className="theme-swatch"
              aria-pressed={active}
              onClick={() => saveTheme(theme.id)}
              disabled={saving}
            >
              <span
                className="theme-swatch-dot"
                style={{ backgroundColor: theme.swatch }}
                aria-hidden="true"
              />
              {theme.label}
              {active && <Check size={16} className="theme-swatch-check" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      <p className="store-logo-note">
        Warna ini dipakai di dashboard, link kasir, dan halaman pesan meja. Struk cetak tetap
        hitam-putih seperti printer thermal.
      </p>
    </div>
  )
}
