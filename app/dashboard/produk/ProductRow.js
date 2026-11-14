'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Money from '@/components/ui/Money'
import { useToast } from '@/components/ui/Toast'
import { categoryOf } from '@/lib/catalog'
import { deleteProduct, updateProductCategory, updateStock } from './actions'

/**
 * Satu baris produk: ubah stok, ubah kategori, hapus.
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
 *
 * Kolom "jenis produk" (utama / sub-produk) dihapus. Sekarang kategori yang
 * mengelompokkan menu, dan semua produk boleh langsung dijual.
 */
export default function ProductRow({ product, categories = [] }) {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleStock = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formData.append('productId', product.id)
    formData.append('currentStock', String(product.stock ?? 0))

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

  const handleCategory = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formData.append('productId', product.id)

    setBusy(true)
    const res = await updateProductCategory(formData)
    setBusy(false)

    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(`Kategori "${product.name}" diperbarui.`)
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
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                objectFit: 'cover',
                border: '1px solid var(--border-color)',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                backgroundColor: 'var(--border-color)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              📦
            </div>
          )}
          <span style={{ fontWeight: 500 }}>{product.name}</span>
        </div>
      </td>
      <td>
        <form onSubmit={handleCategory} className="produk-category-form">
          <label htmlFor={`category-${product.id}`} className="sr-only">
            Kategori untuk {product.name}
          </label>
          <input
            id={`category-${product.id}`}
            name="category"
            list={`product-category-options-${product.id}`}
            defaultValue={product.category || ''}
            placeholder={categoryOf(product)}
            maxLength={60}
            className="produk-category-input"
          />
          <datalist id={`product-category-options-${product.id}`}>
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <Button type="submit" variant="secondary" size="sm" disabled={busy}>
            Simpan
          </Button>
        </form>
        {!product.category && (
          <Badge variant="neutral" className="produk-category-badge">
            Umum
          </Badge>
        )}
      </td>
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
