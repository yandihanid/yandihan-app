'use client'

import { useActionState, useState } from 'react'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import { updateXenditPayout } from './actions'

/**
 * Pengaturan rekening penerima pembayaran On the Table.
 *
 * Tanpa Business ID sub-account, invoice Xendit dibuat dengan akun utama
 * platform, jadi uang pelanggan masuk ke sana. Dengan nilai ini, invoice
 * memakai header `for-user-id` dan dana masuk ke sub-account toko.
 */
export default function XenditPayoutCard({
  storeId,
  initialSubAccountId,
  splitEnabled = false,
  callbackUrl,
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev, formData) => updateXenditPayout(formData),
    null
  )

  const [value, setValue] = useState(initialSubAccountId || '')
  const active = state?.success ? state.subAccountId : initialSubAccountId
  const connected = Boolean(active)

  return (
    <section className="card" style={{ marginTop: '1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <h3 style={{ margin: 0 }}>Rekening Pembayaran</h3>
        <Badge variant={connected ? 'success' : 'warning'}>
          {connected ? 'Sub-account toko' : 'Akun utama'}
        </Badge>
      </div>

      <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '0.5rem' }}>
        {connected
          ? 'Pembayaran dari QR meja masuk langsung ke saldo sub-account Xendit toko ini.'
          : 'Belum diatur, jadi pembayaran dari QR meja masuk ke akun Xendit utama. Isi Business ID sub-account agar dana masuk ke rekening toko.'}
      </p>

      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.success && (
        <Alert variant="success">
          {state.subAccountId
            ? 'Rekening pembayaran tersimpan. Pesanan berikutnya masuk ke sub-account ini.'
            : 'Sub-account dikosongkan. Pesanan berikutnya kembali ke akun utama.'}
        </Alert>
      )}

      <form action={formAction} className="settings-form">
        <input type="hidden" name="storeId" value={storeId} />

        <div className="settings-form-row">
          <Field
            id="xendit-sub-account"
            label="Business ID Sub-Account Xendit"
            hint="Ambil dari Dashboard Xendit > XenPlatform > Sub-accounts. Kosongkan untuk memakai akun utama."
          >
            {(props) => (
              <Input
                {...props}
                name="xenditSubAccountId"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                maxLength={64}
                placeholder="Misal: 65a1b2c3d4e5f6a7b8c9d0e1"
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </Field>

          <Button type="submit" disabled={pending}>
            {pending ? 'Menyimpan…' : 'Simpan Rekening'}
          </Button>
        </div>
      </form>

      {splitEnabled && connected && (
        <Alert variant="info" live={false}>
          Aturan split platform sedang aktif. Bagian platform dipotong otomatis dari setiap
          transaksi, sisanya masuk ke sub-account toko.
        </Alert>
      )}

      <div className="settings-divider" />

      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
          Cara menyiapkan sub-account
        </summary>
        <ol
          style={{
            margin: '0.6rem 0 0',
            paddingLeft: '1.2rem',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            lineHeight: 1.7,
          }}
        >
          <li>
            Buat sub-account di Dashboard Xendit (menu <em>XenPlatform / Sub-accounts</em>), lalu
            tunggu sampai statusnya disetujui.
          </li>
          <li>Salin <strong>Business ID</strong> sub-account tersebut.</li>
          <li>Tempel di kolom di atas, lalu simpan.</li>
          <li>
            Di sub-account itu, arahkan callback invoice ke{' '}
            <code style={{ wordBreak: 'break-all' }}>{callbackUrl}</code> dan samakan callback
            token-nya. Kalau callback belum diarahkan, pesanan tetap tercatat lunas lewat halaman
            status pelanggan, tetapi antrean kasir dan dapur bisa terlambat menerima pesanan.
          </li>
        </ol>
      </details>

      <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Perubahan hanya berlaku untuk pesanan baru. Pesanan yang sudah terlanjur dibuat tetap
        memakai akun saat invoice-nya diterbitkan.
      </p>
    </section>
  )
}
