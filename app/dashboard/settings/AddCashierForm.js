'use client'

import { useActionState, useEffect, useRef } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import { addCashier } from './actions'

/**
 * Tambah kasir baru.
 *
 * Perubahan dari versi sebelumnya:
 *
 * 1. `router.refresh()` tidak lagi dipanggil di sini. `addCashier` sudah
 *    memanggil revalidatePath('/dashboard/settings'), jadi refresh manual berarti
 *    dua pengambilan data untuk satu perubahan — dan versi lama menjalankannya
 *    bahkan setelah gagal, jadi setiap penolakan kuota memicu refresh yang tidak
 *    mengubah apa pun.
 * 2. Pesan error tidak lagi berupa <div> dengan warna hardcode; Alert
 *    membawa role="alert" supaya penolakan kuota benar-benar dibacakan.
 * 3. Input dikosongkan lewat form.reset() setelah sukses, bukan dengan state
 *    terkontrol — satu state kurang untuk hal yang sudah dilakukan browser.
 */
export default function AddCashierForm({ storeId }) {
  const formRef = useRef(null)
  const [state, formAction, pending] = useActionState(
    async (_prev, formData) => addCashier(formData),
    null
  )

  // Reset setelah action berhasil. Dilakukan di efek dan bukan di dalam action
  // karena hasil action baru diketahui setelah render berikutnya; `state`
  // adalah satu-satunya sinyal bahwa penambahan itu benar-benar terjadi.
  useEffect(() => {
    if (state?.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="settings-block">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.success && <Alert variant="success">Kasir ditambahkan.</Alert>}

      <form ref={formRef} action={formAction} className="settings-form">
        <input type="hidden" name="storeId" value={storeId} />

        <div className="settings-form-row">
          <Field
            id="cashier-name"
            label="Tambah Kasir"
            required
            hint="Setiap kasir dapat link sendiri untuk dibuka di HP."
          >
            {(props) => (
              <Input {...props} name="name" maxLength={80} placeholder="Misal: Budi Shift Pagi" />
            )}
          </Field>

          <Button type="submit" disabled={pending}>
            {pending ? 'Memproses…' : 'Tambah Kasir'}
          </Button>
        </div>
      </form>
    </div>
  )
}
