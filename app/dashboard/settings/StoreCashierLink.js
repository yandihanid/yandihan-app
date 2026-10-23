'use client'

import { useState, useSyncExternalStore } from 'react'
import { Copy, Link2, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { rotateStoreCashierToken } from './actions'

const subscribe = () => () => {}

export default function StoreCashierLink({ storeId, token }) {
  const toast = useToast()
  const origin = useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => ''
  )
  const [currentToken, setCurrentToken] = useState(token)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const link = currentToken ? `${origin}/c/${currentToken}` : ''

  async function handleCopy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Gagal menyalin. Pilih teks link lalu salin manual.')
    }
  }

  async function handleRotate() {
    setBusy(true)
    const result = await rotateStoreCashierToken(storeId)
    setBusy(false)
    setConfirming(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    setCurrentToken(result.token)
    toast.success('Link baru dibuat. Link lama dan semua sesi login sudah dicabut.')
  }

  return (
    <div className="store-link">
      <div className="store-link-head">
        <div className="store-link-icon" aria-hidden="true">
          <Link2 size={20} />
        </div>
        <div>
          <h4>Satu link untuk semua kasir</h4>
          <p>
            Bagikan link ini ke kasir. Siapa pun yang membukanya harus masuk dengan username dan
            kata sandi masing-masing. Tidak ada link terpisah per orang.
          </p>
        </div>
      </div>

      {link ? (
        <div className="store-link-row">
          <input
            readOnly
            value={link}
            aria-label="Link kasir toko"
            onFocus={(event) => event.target.select()}
          />
          <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!origin}>
            <Copy size={15} aria-hidden="true" />
            {copied ? 'Tersalin' : 'Salin'}
          </Button>
        </div>
      ) : (
        <p className="store-link-empty">
          Link belum tersedia. Simpan profil toko terlebih dahulu.
        </p>
      )}

      <div className="store-link-foot">
        <p>Link ini hanya bisa dibuka kasir yang akunnya kamu buat di bawah.</p>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} disabled={busy}>
          <RefreshCw size={15} aria-hidden="true" />
          Ganti link
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Ganti link kasir toko?"
        description={
          'Link lama langsung tidak berlaku dan semua kasir yang sedang login akan keluar. ' +
          'Akun kasir, produk, dan riwayat transaksi tidak berubah. Setelah itu, bagikan link ' +
          'baru ke kasir.'
        }
        confirmLabel="Ya, ganti link"
        variant="primary"
        busy={busy}
        onConfirm={handleRotate}
        onClose={() => setConfirming(false)}
      />
    </div>
  )
}
