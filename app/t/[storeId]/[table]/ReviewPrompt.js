'use client'

import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import styles from './tableOrder.module.css'

/**
 * Pop up minta rating Google Maps setelah pembayaran On the Table.
 *
 * Syaratnya:
 *   - pesanan sudah lunas (`paid`), bukan hanya sedang menunggu;
 *   - toko mengisi link rating di dashboard. Kalau linknya kosong, komponen
 *     ini tidak dirender sama sekali -- pop up tidak pernah muncul.
 *
 * Penutupan (tombol "Nanti", tombol Esc, atau menekan tautan rating)
 * dicatat di sessionStorage per pesanan. Efeknya: memuat ulang halaman
 * tidak memunculkan pop up lagi untuk pesanan yang sama, jadi pelanggan
 * tidak merasa dibohongi. Link ratingnya sendiri tetap bisa dibuka dari
 * kartu ringkasan.
 */
export default function ReviewPrompt({ orderId, reviewUrl, reviewNote, storeName, paid }) {
  const [open, setOpen] = useState(false)
  const dismissedRef = useRef(false)
  const storageKey = `yandihan:review:${orderId}`

  useEffect(() => {
    if (!reviewUrl || !paid) return
    if (dismissedRef.current) return

    let dismissed = false
    try {
      dismissed = window.sessionStorage.getItem(storageKey) === '1'
    } catch {
      // sessionStorage bisa diblokir (mode privat sebagian peramban).
      // Kalau tidak bisa dibaca, pop up tetap ditampilkan -- lebih baik
      // satu kali terlalu sering daripada tidak pernah.
    }

    if (dismissed) {
      dismissedRef.current = true
      return
    }

    setOpen(true)
  }, [paid, reviewUrl, storageKey])

  const dismiss = () => {
    dismissedRef.current = true
    try {
      window.sessionStorage.setItem(storageKey, '1')
    } catch {
      // Tidak bisa menyimpan: pop up akan muncul lagi setelah muat ulang,
      // tapi tidak merusak apa pun.
    }
    setOpen(false)
  }

  if (!reviewUrl) return null

  const shopName = storeName || 'kami'

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title="Beri Rating di Google Maps"
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Nanti
          </Button>
          <a
            className={`${styles.linkBtn} ${styles.primaryLink} ${styles.reviewModalBtn}`}
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
          >
            <Star size={15} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
            Buka Google Maps
          </a>
        </>
      }
    >
      <p className="modal-text">
        Terima kasih sudah makan di {shopName}! Rating dari Anda membantu orang lain menemukan
        {shopName}.
      </p>

      {reviewNote && (
        <p className={styles.reviewNote}>
          <Star size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
          {reviewNote}
        </p>
      )}
    </Modal>
  )
}
