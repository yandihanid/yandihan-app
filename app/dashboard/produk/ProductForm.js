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

/**
 * Input foto produk.
 *
 * Dipisah dari ProductForm karena pratinjau gambarnya harus hilang sendiri
 * setelah produk tersimpan. Di sini pratinjau hidup di state lokal
 * komponen ini, jadi me-mount ulang komponen ini (lewat `key`) sudah cukup
 * untuk membersihkannya -- tanpa setState di dalam effect, yang ditolak
 * aturan react-hooks/set-state-in-effect karena memicu cascading render.
 */
function ProductImageField({ disabled }) {
  const fileInputRef = useRef(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [compressing, setCompressing] = useState(false)

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label htmlFor="product-file" className="label" style={{ marginBottom: 0 }}>
        Foto Produk (Opsional)
      </label>
      <input type="hidden" name="imageUrl" value={imagePreview || ''} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          ref={fileInputRef}
          id="product-file"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled || compressing}
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
  )
}

export default function ProductForm({ storeId, categories = [] }) {
  const router = useRouter()
  const formRef = useRef(null)

  const [state, formAction, pending] = useActionState(
    async (_prev, formData) => addProduct(formData),
    null
  )

  useEffect(() => {
    if (!state?.success) return
    formRef.current?.reset()
    router.refresh()
  }, [state, router])

  return (
    <form ref={formRef} action={formAction} className="produk-form">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.success && <Alert variant="success">Produk ditambahkan.</Alert>}

      <input type="hidden" name="storeId" value={storeId} />

      <div className="produk-form-row">
        <Field id="product-name" label="Nama Produk" required>
          {(props) => (
            <Input {...props} name="name" maxLength={120} placeholder="Misal: Nasi Goreng" />
          )}
        </Field>

        <Field
          id="product-category"
          label="Kategori"
          hint="Opsional. Mengelompokkan menu di link kasir dan On the Table."
        >
          {(props) => (
            <>
              <Input
                {...props}
                name="category"
                list="product-category-options"
                maxLength={60}
                placeholder="Misal: Makanan"
              />
              {/* Pilihan cepat: kategori yang sudah dipakai toko. Input tetap
                  bebas supaya pemilik bisa membuat kategori baru tanpa harus
                  menambah produk lebih dulu. */}
              <datalist id="product-category-options">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </>
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

        {/* key memakai id produk yang baru dibuat: setiap produk yang
            tersimpan me-mount ulang komponen ini, jadi pratinjau foto ikut
            terbersihkan tanpa setState di dalam effect. */}
        <ProductImageField key={state?.id || 'new'} disabled={pending} />

        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan…' : 'Tambah Produk'}
        </Button>
      </div>
    </form>
  )
}
