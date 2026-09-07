'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Trash2 } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { deleteCashier, rotateCashierToken } from './actions'

/**
 * Satu baris kasir: nama, jenis, link, dan aksinya.
 *
 * Yang baru di sini adalah **tombol cabut token**. `rotateCashierToken` sudah
 * ada di actions.js sejak tahap sebelumnya tapi tidak punya satu pun pemanggil,
 * jadi sampai sekarang satu-satunya cara mencabut link kasir yang bocor adalah
 * menghapus kasirnya — yang juga menghapus riwayat transaksinya dari tampilan.
 *
 * Dua dialog, bukan confirm(). Bedanya bukan kosmetik: token yang dicabut
 * mematikan link yang mungkin sudah dikirim ke HP kasir dan me-reset ikatan
 * perangkatnya. "Cabut token?" tidak menyampaikan itu; teks di dialog
 * menyampaikannya.
 *
 * window.location.origin dibaca SAAT tombol diklik, bukan di dalam useEffect.
 * Versi sebelumnya menyimpannya ke state lewat efek, yang berarti render
 * pertama selalu menghasilkan link salah ("/c/<token>" tanpa domain) lalu
 * render kedua memperbaikinya — pola yang dilarang aturan
 * react-hooks/set-state-in-effect. Nilainya tidak pernah berubah selama halaman
 * terbuka, jadi menyimpannya di state tidak memberi keuntungan apa pun; handler
 * klik hanya berjalan di browser, tempat window selalu ada.
 */
export default function CashierRow({ cashier }) {
  const router = useRouter()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(null) // 'delete' | 'rotate' | null
  const [busy, setBusy] = useState(false)

  const label = cashier.name || 'Tanpa Nama'

  const handleCopy = async () => {
    if (!cashier.token) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/c/${cashier.token}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard.writeText ditolak (izin, atau konteks tidak aman). Jangan
      // menampilkan "Tersalin" untuk sesuatu yang tidak tersalin.
      toast.error('Gagal menyalin. Salin manual dari kotak di sebelah kiri.')
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    const fd = new FormData()
    fd.append('cashierId', cashier.id)
    const res = await deleteCashier(fd)
    setBusy(false)
    setConfirming(null)

    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(`Kasir "${label}" dihapus.`)
    router.refresh()
  }

  const handleRotate = async () => {
    setBusy(true)
    const fd = new FormData()
    fd.append('cashierId', cashier.id)
    const res = await rotateCashierToken(fd)
    setBusy(false)
    setConfirming(null)

    if (res.error) {
      toast.error(res.error)
      return
    }
    // Toast-nya tidak memuat token barunya. Token adalah kredensial, dan toast
    // bisa tertinggal di layar yang dilihat orang lain; link barunya sudah ada
    // di kolom sebelah setelah refresh.
    toast.success('Token baru dibuat. Link lama sudah tidak berlaku.')
    router.refresh()
  }

  return (
    <tr>
      <td>{label}</td>
      <td>
        {cashier.telegram_chat_id ? (
          <Badge variant="info">Telegram</Badge>
        ) : (
          <Badge>Web</Badge>
        )}
      </td>
      <td>
        {cashier.token ? (
          <div className="cashier-link">
            <input
              readOnly
              value={`/c/${cashier.token}`}
              aria-label={`Link kasir ${label}`}
              onFocus={(e) => e.target.select()}
            />
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? 'Tersalin' : 'Salin'}
            </Button>
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        )}
      </td>
      <td>
        <div className="cashier-actions">
          {cashier.token && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirming('rotate')}
              disabled={busy}
            >
              <KeyRound size={15} aria-hidden="true" />
              Cabut Token
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirming('delete')}
            disabled={busy}
          >
            <Trash2 size={15} aria-hidden="true" />
            Hapus
          </Button>
        </div>

        <ConfirmDialog
          open={confirming === 'rotate'}
          title={`Cabut token kasir "${label}"?`}
          description={
            'Link kasir yang sekarang langsung tidak berlaku, dan perangkat yang ' +
            'sudah terikat ikut di-reset. Kasir perlu dikirimi link baru sebelum ' +
            'bisa berjualan lagi. Riwayat transaksinya tidak terpengaruh.'
          }
          confirmLabel="Ya, cabut token"
          variant="primary"
          busy={busy}
          onConfirm={handleRotate}
          onClose={() => setConfirming(null)}
        />

        <ConfirmDialog
          open={confirming === 'delete'}
          title={`Hapus kasir "${label}"?`}
          description={
            'Link kasirnya mati dan kasir ini hilang dari daftar. Transaksi yang ' +
            'sudah tercatat tetap ada di laporan, tapi tidak lagi menunjukkan nama ' +
            'kasirnya. Tindakan ini tidak bisa dibatalkan.'
          }
          confirmLabel="Ya, hapus"
          busy={busy}
          onConfirm={handleDelete}
          onClose={() => setConfirming(null)}
        />
      </td>
    </tr>
  )
}
