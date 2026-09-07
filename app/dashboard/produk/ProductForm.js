'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import { addProduct } from './actions'

/**
 * Tambah produk baru.
 *
 * Perubahan dari versi sebelumnya:
 *
 * 1. `alert(res.error)` -> Alert di dalam form. Pesan seperti «Produk "Nasi
 *    Goreng" sudah ada di toko ini» adalah koreksi terhadap isi form, jadi
 *    tempatnya di sebelah form itu — bukan di kotak dialog yang harus ditutup
 *    dulu sebelum nama produknya bisa diperbaiki.
 * 2. Tiga useState untuk tiga input hilang. Nilainya tidak dipakai untuk apa pun
 *    selain dikirim, jadi FormData sudah cukup; setelah sukses form.reset()
 *    yang mengosongkannya.
 * 3. Label lewat Field: sebelumnya <label> tanpa htmlFor, jadi mengklik "Harga
 *    (Rp)" tidak memfokuskan inputnya dan pembaca layar membacakan tiga input
 *    tanpa nama.
 */
export default function ProductForm({ storeId }) {
  const router = useRouter()
  const formRef = useRef(null)
  const [state, formAction, pending] = useActionState(
    async (_prev, formData) => addProduct(formData),
    null
  )

  useEffect(() => {
    if (!state?.success) return
    formRef.current?.reset()
    // addProduct sudah revalidatePath('/dashboard/produk'), tapi revalidate itu
    // berlaku untuk navigasi berikutnya; refresh() yang membuat daftar di bawah
    // form ikut memuat produk barunya sekarang.
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

        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan…' : 'Tambah Produk'}
        </Button>
      </div>
    </form>
  )
}
