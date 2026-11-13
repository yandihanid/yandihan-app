'use client'

import { useActionState, useRef, useState } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import { compressImage, readFileAsDataUrl } from '@/app/c/[token]/imageUtils'
import { updateStoreLogo } from './actions'

/**
 * Pengaturan logo usaha.
 *
 * Dua sumber logo diterima:
 *
 *   1. Upload file -- dikompres di browser (sisi terpanjang 800px, JPEG 0.7)
 *      lalu dikirim sebagai data URL. File asli dari kamera HP bisa 3-8 MB;
 *      kalau dikirim apa adanya, database jadi berat dan halaman struk (yang
 *      publik dan bisa diakses siapa saja) ikut memuat file sebesar itu.
 *   2. URL http/https -- untuk pemilik yang sudah meng-host logonya sendiri.
 *
 * Nilai yang disimpan benar-benar dikirim lewat hidden field, bukan lewat
 * state React: server action membaca FormData, dan isinya harus ada di
 * sana. `_remove` menandai penghapusan supaya string kosong tidak ambigu
 * dengan "tidak diubah".
 */
export default function StoreLogoForm({ store }) {
  const fileInputRef = useRef(null)
  const [logoValue, setLogoValue] = useState(store?.logo_url || '')
  const [urlValue, setUrlValue] = useState('')
  const [compressing, setCompressing] = useState(false)
  const [removed, setRemoved] = useState(false)

  const [state, formAction, pending] = useActionState(
    async (_prev, formData) => updateStoreLogo(formData),
    null
  )

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoValue('')
      return
    }

    try {
      setCompressing(true)
      const compressed = await compressImage(file)
      const dataUrl = await readFileAsDataUrl(compressed)
      setLogoValue(dataUrl)
      setUrlValue('')
      setRemoved(false)
    } catch {
      setLogoValue('')
    } finally {
      setCompressing(false)
    }
  }

  const handleUrlChange = (event) => {
    const value = event.target.value
    setUrlValue(value)
    setLogoValue(value)
    setRemoved(false)
  }

  const handleRemove = () => {
    setLogoValue('')
    setUrlValue('')
    setRemoved(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <form action={formAction} className="settings-form">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.success && <Alert variant="success">Logo tersimpan.</Alert>}

      <input type="hidden" name="storeId" value={store?.id ?? ''} />
      <input type="hidden" name="logoUrl" value={logoValue} />

      <div className="store-logo-row">
        <div className="store-logo-preview">
          {logoValue ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoValue} alt="Logo usaha" />
          ) : (
            <div className="store-logo-empty" aria-hidden="true">
              <ImageIcon size={20} />
            </div>
          )}
        </div>

        <div className="store-logo-fields">
          <Field id="store-logo-file" label="Upload Logo" hint="JPG, PNG, WEBP, atau GIF. Maksimal sekitar 300 KB setelah dikompres.">
            {(props) => (
              <input
                {...props}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={pending || compressing}
              />
            )}
          </Field>

          <Field id="store-logo-url" label="Atau pakai URL Logo" hint="Kalau logo sudah di-host di luar, tempel tautannya di sini.">
            {(props) => (
              <Input
                {...props}
                type="url"
                inputMode="url"
                value={urlValue}
                onChange={handleUrlChange}
                placeholder="https://contoh.com/logo.png"
                maxLength={2000}
                disabled={pending || compressing}
              />
            )}
          </Field>

          <div className="store-logo-actions">
            {logoValue ? (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={pending}>
                <X size={14} aria-hidden="true" />
                Hapus logo
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={pending || compressing}>
              {pending ? 'Menyimpan…' : 'Simpan logo'}
            </Button>
          </div>

          {removed && !state?.success && (
            <p className="store-logo-note">
              Logo akan dihapus setelah tombol Simpan ditekan.
            </p>
          )}
          {compressing && (
            <p className="store-logo-note">Mengompres gambar…</p>
          )}
        </div>
      </div>
    </form>
  )
}
