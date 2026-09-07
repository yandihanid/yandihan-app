'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Money from '@/components/ui/Money'
import { useToast } from '@/components/ui/Toast'
import { deleteProduct, updateStock } from './actions'

/**
 * Satu baris produk: ubah stok, hapus.
 *
 * Dua hal yang sebelumnya hilang di sini, keduanya tentang hasil yang tidak
 * pernah sampai ke pengguna:
 *
 * 1. `<form action={updateStock}>` dan `<form action={deleteProduct}>` dipakai
 *    langsung dari Server Component, jadi `{ error }` yang dikembalikan kedua
 *    action itu **dibuang** (temuan L2). "Stok tidak valid" dan "Produk bukan
 *    milik Anda" sama-sama terlihat seperti berhasil: halaman ter-revalidate,
 *    angkanya kembali ke nilai lama, tanpa satu kata penjelasan.
 *
 * 2. Hapus produk tidak punya konfirmasi sama sekali — satu klik salah dan
 *    produknya hilang. Hapus kasir sudah punya confirm(), hapus produk tidak.
 *
 * Kenapa handler manual dan bukan useActionState: baris ini punya dua action
 * dengan hasil yang ditampilkan lewat jalur berbeda (toast, bukan teks inline),
 * dan salah satunya harus lewat dialog konfirmasi dulu. useActionState per-baris
 * berarti dua hook + dua efek untuk mengubah `state` jadi toast; memanggil
 * action-nya langsung lebih sedikit perantara untuk hal yang sama.
 *
 * Nilai stok dibiarkan uncontrolled (defaultValue + FormData): tidak ada yang
 * perlu dihitung dari nilainya selama diketik, jadi menyimpannya di state hanya
 * berarti satu render per ketukan tombol.
 */
export default function ProductRow({ product }) {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleStock = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formData.append('productId', product.id)

    setBusy(true)
    const res = await updateStock(formData)
    setBusy(false)

    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(`Stok "${product.name}" diperbarui.`)
    router.refresh()
  }

  const handleDelete = async () => {
    const formData = new FormData()
    formData.append('productId', product.id)

    setBusy(true)
    const res = await deleteProduct(formData)
    setBusy(false)
    setConfirming(false)

    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(`Produk "${product.name}" dihapus.`)
    router.refresh()
  }

  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{product.name}</td>
      <td>
        <Money value={product.price} />
      </td>
      <td>{product.stock ?? 0}</td>
      <td>
        <div className="produk-actions">
          <form onSubmit={handleStock} className="produk-stock-form">
            {/* Label tetap ada di DOM meski disembunyikan: tanpa nama, pembaca
                layar hanya membacakan "spin button" berkali-kali di tabel yang
                berisi dua puluh baris identik. */}
            <label htmlFor={`stock-${product.id}`} className="sr-only">
              Stok baru untuk {product.name}
            </label>
            <input
              id={`stock-${product.id}`}
              type="number"
              name="newStock"
              min="0"
              step="1"
              inputMode="numeric"
              defaultValue={product.stock ?? 0}
              className="produk-stock-input"
            />
            <Button type="submit" variant="secondary" size="sm" disabled={busy}>
              Simpan
            </Button>
          </form>

          <Button variant="danger" size="sm" onClick={() => setConfirming(true)} disabled={busy}>
            <Trash2 size={15} aria-hidden="true" />
            Hapus
          </Button>
        </div>

        <ConfirmDialog
          open={confirming}
          title={`Hapus produk "${product.name}"?`}
          description={
            'Produk ini hilang dari layar kasir dan tidak bisa dijual lagi. Transaksi ' +
            'yang sudah tercatat tetap ada di laporan. Tindakan ini tidak bisa dibatalkan.'
          }
          confirmLabel="Ya, hapus"
          busy={busy}
          onConfirm={handleDelete}
          onClose={() => setConfirming(false)}
        />
      </td>
    </tr>
  )
}
