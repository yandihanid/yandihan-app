'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import { compressImage, readFileAsDataUrl } from '@/app/c/[token]/imageUtils'
import { addProduct } from './actions'
import { Image as ImageIcon, X } from 'lucide-react'

export default function ProductForm({ storeId }) {
  const router = useRouter()
  const formRef = useRef(null)
  const fileInputRef = useRef(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [compressing, setCompressing] = useState(false)

  const [state, formAction, pending] = useActionState(
    async (_prev, formData) => addProduct(formData),
    null
  )

  useEffect(() => {
    if (!state?.success) return
    formRef.current?.reset()
    setImagePreview(null)
    router.refresh()
  }, [state, router])

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar (JPG, PNG, WEBP).')
      return
    }

    try {
      setCompressing(true)
      const compressed = await compressImage(file)
      const dataUrl = await readFileAsDataUrl(compressed)
      setImagePreview(dataUrl)
    } catch {
      alert('Gagal memproses gambar.')
    } finally {
      setCompressing(false)
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <form ref={formRef} action={formAction} className="produk-form">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.success && <Alert variant="success">Produk ditambahkan.</Alert>}

      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="imageUrl" value={imagePreview || ''} />

      <div className="produk-form-row">
        <Field id="product-name" label="Nama Produk" required>
          {(props) => (
            <Input {...props} name="name" maxLength={120} placeholder="Misal: Nasi Goreng" />
          )}
        </Field>

        <Field id="product-type" label="Jenis Produk" required>
          {(props) => (
            <select {...props} name="productType" className="input" defaultValue="main">
              <option value="main">Produk utama</option>
              <option value="sub">Sub-produk / tambahan</option>
            </select>
          )}
        </Field>

        <Field id="product-price" label="Harga (Rp)" required>
          {(props) => (
            <Input
              {...props}
              name="price"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="25000"
            />
          )}
        </Field>

        <Field id="product-stock" label="Stok Awal" required>
          {(props) => (
            <Input
              {...props}
              name="stock"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="50"
            />
          )}
        </Field>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label htmlFor="product-file" className="label" style={{ marginBottom: 0 }}>
            Foto Produk (Opsional)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              id="product-file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={pending || compressing}
              style={{ fontSize: '0.875rem' }}
            />
            {compressing && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mengompres foto...</span>}
            {imagePreview && (
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <img
                  src={imagePreview}
                  alt="Pratinjau"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 6,
                    objectFit: 'cover',
                    border: '1.5px solid var(--primary-color)',
                  }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  aria-label="Hapus foto"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        <Button type="submit" disabled={pending || compressing}>
          {pending ? 'Menyimpan…' : 'Tambah Produk'}
        </Button>
      </div>
    </form>
  )
}
