'use client'

import { useEffect, useRef } from 'react'
import Modal from './Modal'
import Button from './Button'

/**
 * Pengganti confirm() bawaan browser.
 *
 * Kenapa perlu diganti, bukan sekadar diperindah:
 *   * confirm() tidak bisa menjelaskan akibat tindakan. "Hapus kasir?" dan
 *     "Hapus kasir? Link /c/<token> miliknya langsung mati" adalah dua
 *     keputusan yang berbeda bagi penggunanya.
 *   * confirm() memblokir thread, jadi tidak ada state "sedang menghapus…" --
 *     pengguna bisa menekan tombolnya dua kali.
 *   * di beberapa browser (dan di dalam WebView Capacitor yang dipakai APK
 *     aplikasi ini) confirm() bisa ditekan diam-diam oleh setelan pengguna,
 *     sehingga aksinya jalan tanpa pernah bertanya.
 *
 * Fokus awal jatuh ke tombol batal, bukan tombol konfirmasi: kalau seseorang
 * menekan Enter karena refleks, yang terjadi adalah pembatalan.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  busy = false,
  onConfirm,
  onClose,
}) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      actions={
        <>
          <Button
            ref={cancelRef}
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button variant={variant} size="sm" onClick={onConfirm} disabled={busy}>
            {busy ? 'Memproses…' : confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p className="modal-text">{description}</p>}
    </Modal>
  )
}
