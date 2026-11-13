'use client'

import { useActionState, useState } from 'react'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Switch from '@/components/ui/Switch'
import { PAYOUT_BANK_CODES } from '@/lib/payoutBanks'
import { updateStorePayoutSettings } from './actions'

/**
 * Rekening pencairan untuk toko.
 *
 * Alurnya: seluruh pembayaran pelanggan masuk ke satu akun Xendit milik
 * platform, lalu pengelola platform mengirimkannya ke rekening yang diisi
 * di sini. Jadi halaman ini adalah tempat toko memberi tahu "transfer ke
 * sini".
 *
 * Biaya layanan yang dibayar pelanggan bukan bagian dari saldo toko, dan
 * potongan platform ditetapkan oleh pengelola platform (bukan dari sini).
 */
export default function StorePayoutCard({ storeId, payout, balance }) {
  const [state, formAction, pending] = useActionState(
    async (_prev, formData) => updateStorePayoutSettings(formData),
    null
  )

  const [enabled, setEnabled] = useState(Boolean(payout?.payout_enabled))

  const bankCode = payout?.payout_bank_code || ''
  const accountNumber = payout?.payout_account_number || ''
  const accountName = payout?.payout_account_name || ''
  const minimum = payout?.payout_minimum_idr ?? 10000

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
        <h3 style={{ margin: 0 }}>Rekening Pencairan</h3>
        <Badge variant={enabled ? 'success' : 'warning'}>
          {enabled ? 'Siap dicairkan' : 'Belum aktif'}
        </Badge>
      </div>

      <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '0.5rem' }}>
        Pembayaran dari QR meja masuk ke saldo platform, lalu dikirim ke rekening di bawah
        sesuai omzet toko. Isi rekening dengan teliti: kalau salah, uangnya ditolak bank.
      </p>

      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.success && <Alert variant="success">Rekening pencairan tersimpan.</Alert>}

      <form action={formAction} className="settings-form">
        <input type="hidden" name="storeId" value={storeId} />
        {/* Switch-nya bukan input form, jadi nilainya dikirim lewat hidden
            field yang mengikuti state-nya. */}
        <input type="hidden" name="payoutEnabled" value={enabled ? 'true' : 'false'} />

        <div className="settings-form-row">
          <Field id="payout-bank" label="Bank Tujuan" required>
            {(props) => (
              <select {...props} name="bankCode" className="input" defaultValue={bankCode}>
                <option value="">Pilih bank</option>
                {PAYOUT_BANK_CODES.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.label}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field id="payout-account-number" label="Nomor Rekening" required>
            {(props) => (
              <Input
                {...props}
                name="accountNumber"
                inputMode="numeric"
                defaultValue={accountNumber}
                maxLength={30}
                placeholder="1234567890"
                autoComplete="off"
              />
            )}
          </Field>
        </div>

        <div className="settings-form-row">
          <Field id="payout-account-name" label="Nama Pemilik Rekening" required>
            {(props) => (
              <Input
                {...props}
                name="accountName"
                defaultValue={accountName}
                maxLength={80}
                placeholder="Nama sesuai rekening bank"
                autoComplete="off"
              />
            )}
          </Field>

          <Field
            id="payout-minimum"
            label="Minimum Pencairan (Rp)"
            hint="Saldo minimal sebelum uang dikirim ke rekening ini."
          >
            {(props) => (
              <Input
                {...props}
                name="payoutMinimum"
                type="number"
                inputMode="numeric"
                min="0"
                step="1000"
                defaultValue={minimum}
              />
            )}
          </Field>
        </div>

        <div className="settings-form-row">
          <div className="switch-row" style={{ flex: '1 1 auto' }}>
            <div className="switch-row-text">
              <label htmlFor="payout-enabled">
                <strong>Izinkan pencairan pendapatan toko ini</strong>
              </label>
              <span>Selama nonaktif, platform tidak mengirim pencairan ke toko ini.</span>
            </div>
            <Switch
              id="payout-enabled"
              checked={enabled}
              onChange={setEnabled}
              disabled={pending}
              label="Izinkan pencairan pendapatan toko ini"
            />
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? 'Menyimpan…' : 'Simpan rekening'}
          </Button>
        </div>
      </form>

      {balance && (
        <div className="settings-divider" />
      )}

      {balance && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
          Saldo belum dicairkan: <strong>{balance.amountFormatted}</strong> dari{' '}
          {balance.orderCount} pesanan. Plataform yang mengirim pencairan.
        </p>
      )}
    </section>
  )
}
