'use client'

import { useActionState } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import { updateStore } from './actions'

/**
 * Form nama toko.
 *
 * Sebelumnya komponen ini menulis tabel `stores` langsung dari browser:
 *
 *     await supabase.from('stores').update({ name }).eq('id', store.id)
 *     setLoading(false); router.refresh()
 *
 * Hasilnya tidak pernah diperiksa, jadi setiap kegagalan — RLS menolak, baris
 * tidak cocok, jaringan mati — terlihat identik dengan berhasil: spinner
 * berhenti, halaman refresh, nama lama kembali muncul (temuan L2). Sekarang
 * penulisannya lewat server action `updateStore` yang memeriksa kepemilikan dan
 * memastikan ada baris yang benar-benar berubah.
 *
 * useActionState dipakai karena inilah yang membuat `{ error }` dari action
 * benar-benar sampai ke layar. Signature action-nya (formData) saja, bukan
 * (prevState, formData), karena action yang sama tidak hanya dipanggil dari
 * sini — adapter satu baris di bawah yang menjembatani, bukan action-nya yang
 * dipaksa mengikuti bentuk hook.
 *
 * `pending` dari hook, bukan useState sendiri: state yang dihitung React tidak
 * bisa tertinggal kalau ada jalur keluar yang lupa mengembalikannya ke false.
 */
export default function SettingsForm({ store }) {
  const [state, formAction, pending] = useActionState(
    async (_prev, formData) => updateStore(formData),
    null
  )

  return (
    <form action={formAction} className="settings-form">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.success && <Alert variant="success">Profil toko tersimpan.</Alert>}

      {/* storeId ikut dikirim sebagai hidden field, bukan lewat closure: kalau
          kosong, action membacanya sebagai "buat toko baru". */}
      <input type="hidden" name="storeId" value={store?.id ?? ''} />

      <div className="settings-form-row">
        <Field id="store-name" label="Nama Toko" required hint="Muncul di struk dan di layar kasir.">
          {(props) => (
            <Input
              {...props}
              name="name"
              defaultValue={store?.name ?? ''}
              maxLength={80}
              placeholder="Misal: Warung Bu Ida"
            />
          )}
        </Field>

        <Field id="store-phone" label="Nomor Telepon" hint="Opsional. Ditampilkan di struk.">
          {(props) => (
            <Input
              {...props}
              type="tel"
              inputMode="tel"
              name="phone"
              defaultValue={store?.phone ?? ''}
              maxLength={20}
              placeholder="Misal: 0812 3456 7890"
            />
          )}
        </Field>
      </div>

      <div className="settings-form-row">
        <Field id="store-address" label="Alamat Toko" hint="Opsional. Ditampilkan di struk.">
          {(props) => (
            <Input
              {...props}
              name="address"
              defaultValue={store?.address ?? ''}
              maxLength={200}
              placeholder="Misal: Jl. Melati No. 10"
            />
          )}
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
