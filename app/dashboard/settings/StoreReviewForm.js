'use client'

import { useActionState } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import { updateStoreReview } from './actions'

/**
 * Pengaturan rating Google Maps untuk pesanan On the Table.
 *
 * Kalau `reviewUrl` kosong, tidak ada pop up rating yang muncul setelah
 * pelanggan membayar. Itu disengaja: sebagian toko tidak ingin dimintai
 * rating, jadi fiturnya harus bisa dimatikan tanpa mengubah kode.
 *
 * `reviewNote` opsional dan hanya dipakai sebagai pesan di dalam pop up --
 * misalnya "Rate Google Maps kami untuk dapat es teh gratis, tunjukkan
 * kasir".
 */
export default function StoreReviewForm({ store }) {
  const [state, formAction, pending] = useActionState(
    async (_prev, formData) => updateStoreReview(formData),
    null
  )

  return (
    <form action={formAction} className="settings-form">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.success && <Alert variant="success">Pengaturan rating tersimpan.</Alert>}

      <input type="hidden" name="storeId" value={store?.id ?? ''} />

      <div className="settings-form-row">
        <Field
          id="store-review-url"
          label="Link Rating Google Maps"
          hint="Salin link dari Google Maps (Bagikan > Salin tautan). Kalau dikosongkan, pop up rating tidak muncul untuk pelanggan."
        >
          {(props) => (
            <Input
              {...props}
              type="url"
              inputMode="url"
              name="reviewUrl"
              defaultValue={store?.gmaps_review_url ?? ''}
              maxLength={500}
              placeholder="https://maps.app.goo.gl/..."
            />
          )}
        </Field>
      </div>

      <div className="settings-form-row">
        <Field
          id="store-review-note"
          label="Catatan untuk Pelanggan (Opsional)"
          hint="Contoh: “Rate Google Maps kami untuk dapat es teh gratis, tunjukkan kasir.”"
        >
          {(props) => (
            <textarea
              {...props}
              name="reviewNote"
              className="input textarea"
              defaultValue={store?.gmaps_review_note ?? ''}
              maxLength={300}
              rows={3}
              placeholder="Rate Google Maps kami untuk dapat es teh gratis, tunjukkan kasir."
            />
          )}
        </Field>
      </div>

      <div className="settings-form-row">
        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan…' : 'Simpan pengaturan rating'}
        </Button>
      </div>
    </form>
  )
}
