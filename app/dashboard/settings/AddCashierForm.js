'use client'

import { useActionState, useEffect, useRef } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import { addCashier } from './actions'

/**
 * Tambah akun kasir.
 *
 * Yang dibuat adalah AKUN LOGIN untuk satu link toko, bukan link baru. Karena
 * itu field-nya nama, username, dan kata sandi. Kuota mengikuti paket: GRATIS
 * satu akun, PRO tanpa batas.
 */
export default function AddCashierForm({ storeId, isPro, remaining }) {
  const formRef = useRef(null)
  const [state, formAction, pending] = useActionState(
    async (_prev, formData) => addCashier(formData),
    null
  )

  useEffect(() => {
    if (state?.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="settings-block">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.success && <Alert variant="success">Akun kasir ditambahkan.</Alert>}

      <div className="settings-section-head">
        <div>
          <h4>Tambah akun kasir</h4>
          <p>
            {isPro
              ? 'Paket PRO: tambahkan akun sebanyak kebutuhan tim.'
              : remaining > 0
                ? 'Paket GRATIS: satu akun kasir. Upgrade ke PRO untuk menambah lagi.'
                : 'Kuota akun kasir paket GRATIS sudah terpakai.'}
          </p>
        </div>
      </div>

      <form ref={formRef} action={formAction} className="settings-form">
        <input type="hidden" name="storeId" value={storeId} />

        <div className="settings-form-grid">
          <Field id="cashier-name" label="Nama kasir" required hint="Nama yang muncul di struk.">
            {(props) => (
              <Input {...props} name="name" maxLength={80} placeholder="Misal: Budi Shift Pagi" autoComplete="off" />
            )}
          </Field>

          <Field
            id="cashier-username"
            label="Username"
            required
            hint="Huruf kecil, angka, titik, garis bawah, atau tanda hubung."
          >
            {(props) => (
              <Input
                {...props}
                name="username"
                maxLength={32}
                placeholder="budi"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            )}
          </Field>

          <Field id="cashier-password" label="Kata sandi" required hint="Minimal 6 karakter.">
            {(props) => (
              <Input
                {...props}
                name="password"
                type="password"
                maxLength={72}
                placeholder="Kata sandi kasir"
                autoComplete="new-password"
              />
            )}
          </Field>
        </div>

        <div className="settings-form-actions">
          <Button type="submit" disabled={pending}>
            {pending ? 'Menyimpan…' : 'Tambah Akun Kasir'}
          </Button>
        </div>
      </form>
    </div>
  )
}
