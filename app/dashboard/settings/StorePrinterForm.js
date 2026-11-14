'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import { RECEIPT_PRINTER_WIDTHS, normalizeReceiptPrinter } from '@/lib/receiptPrinter'
import { updateStorePrinter } from './actions'

/**
 * Lebar kertas struk.
 *
 * Printer thermal datang dalam dua ukuran umum: 58 mm (struk warung) dan
 * 80 mm (struk resto). Ukuran ini menentukan berapa lebar halaman saat
 * struk dicetak, jadi struk 58 mm tidak lagi harus diperkecil 50% di dialog
 * cetak browser -- yang membuat tulisannya jadi buram dan tidak terbaca.
 */
export default function StorePrinterForm({ store }) {
  const router = useRouter()
  const [value, setValue] = useState(normalizeReceiptPrinter(store?.receipt_printer))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const save = async (next) => {
    const previous = value
    setValue(next)
    setSaving(true)

    const formData = new FormData()
    formData.set('storeId', store?.id ?? '')
    formData.set('receiptPrinter', next)

    const result = await updateStorePrinter(formData)
    setSaving(false)

    if (result?.error) {
      setValue(previous)
      setMessage({ type: 'error', text: result.error })
      return
    }

    setMessage({ type: 'success', text: 'Ukuran kertas struk tersimpan.' })
    router.refresh()
  }

  return (
    <div className="settings-form">
      {message?.type === 'error' && <Alert variant="error">{message.text}</Alert>}
      {message?.type === 'success' && <Alert variant="success">{message.text}</Alert>}

      <div className="setting-row">
        <div className="setting-row-text">
          <strong>Lebar kertas struk</strong>
          <span>Pilih sesuai printer toko. Struk langsung dicetak dengan ukuran yang benar.</span>
        </div>
        <select
          className="input"
          value={value}
          onChange={(event) => save(event.target.value)}
          disabled={saving}
          aria-label="Lebar kertas struk"
        >
          {RECEIPT_PRINTER_WIDTHS.map((printer) => (
            <option key={printer.id} value={printer.id}>
              {printer.label} — {printer.hint}
            </option>
          ))}
        </select>
      </div>

      <div className="store-logo-actions">
        <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => save(value)}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </div>
  )
}
