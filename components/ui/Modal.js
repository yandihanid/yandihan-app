'use client'

import { useEffect, useId, useRef } from 'react'

/**
 * Dialog di atas <dialog> native + showModal().
 *
 * Alasan memakai elemen native, bukan div + overlay sendiri: browser yang
 * mengurus focus trap, Esc, `inert` pada konten di belakang, dan pengembalian
 * fokus ke elemen pemicu saat ditutup. Menulis itu sendiri berarti empat
 * kesempatan untuk salah, dan dialog yang salah dalam hal fokus tidak bisa
 * dioperasikan tanpa mouse.
 *
 * showModal() dipanggil di efek (bukan lewat atribut `open`) karena hanya
 * showModal() yang menghasilkan ::backdrop dan perilaku modal; atribut `open`
 * membuat dialog non-modal yang tidak menahan fokus.
 */
export default function Modal({ open, onClose, title, children, actions, labelledBy }) {
  const ref = useRef(null)
  const autoId = useId()
  const titleId = labelledBy ?? `${autoId}-title`

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  // Esc dan klik tombol close browser memicu 'cancel'/'close' langsung di
  // elemen, tanpa lewat React. Tanpa menyambungkannya, state `open` milik
  // pemanggil jadi tidak sinkron dan dialog tidak bisa dibuka lagi.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleClose = () => onClose?.()
    el.addEventListener('close', handleClose)
    return () => el.removeEventListener('close', handleClose)
  }, [onClose])

  return (
    <dialog ref={ref} className="modal" aria-labelledby={title ? titleId : undefined}>
      <div className="modal-body">
        {title && (
          <h2 className="modal-title" id={titleId}>
            {title}
          </h2>
        )}
        {children}
      </div>
      {actions && <div className="modal-actions">{actions}</div>}
    </dialog>
  )
}
