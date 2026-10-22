'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deletePendingOrder } from './actions'
import { CheckCircle2, Download, ExternalLink, Play, Trash2 } from 'lucide-react'

export default function OrderActionRow({ order, storeId }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isPaid = order.status === 'paid'

  const handlePayNow = (orderId) => {
    // Simpan pending order ke localStorage agar tombol verifikasi muncul
    try {
      localStorage.setItem('yandihan_pending_order', orderId)
      localStorage.setItem('yandihan_pending_store', storeId)
    } catch {}

    // Scroll ke atas agar pengguna melihat banner pembayaran / cek status
    window.scrollTo({ top: 0, behavior: 'smooth' })
    alert(`Order ${orderId} siap dilanjutkan. Anda dapat mengecek status pembayaran atau mengklik tombol upgrade di atas jika ingin membuat sesi baru.`)
  }

  const handleDelete = async (orderId) => {
    if (!confirm(`Hapus order ${orderId}? Pembayaran yang belum selesai untuk order ini akan dibatalkan.`)) {
      return
    }

    setLoading(true)
    try {
      const res = await deletePendingOrder(orderId)
      if (res?.error) {
        alert(res.error)
      } else {
        try {
          if (localStorage.getItem('yandihan_pending_order') === orderId) {
            localStorage.removeItem('yandihan_pending_order')
            localStorage.removeItem('yandihan_pending_store')
          }
        } catch {}
        router.refresh()
      }
    } catch {
      alert('Gagal menghapus order. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
      {/* Tombol Download / Cetak Invoice Lunas atau Tagihan */}
      <a
        href={`/dashboard/billing/invoice/${order.order_id}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.75rem',
          padding: '0.3rem 0.6rem',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--card-bg)',
          color: 'var(--text-main)',
          fontWeight: 600,
          textDecoration: 'none',
        }}
        title="Buka / Cetak Invoice"
      >
        <Download size={13} />
        {isPaid ? 'Invoice Lunas' : 'Invoice'}
      </a>

      {/* Jika status masih pending / belum lunas: Tampilkan tombol Lanjut & Hapus */}
      {!isPaid && (
        <>
          <button
            type="button"
            onClick={() => handlePayNow(order.order_id)}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              padding: '0.3rem 0.6rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#d97706',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Lanjutkan Pembayaran"
          >
            <Play size={12} />
            Lanjut
          </button>

          <button
            type="button"
            onClick={() => handleDelete(order.order_id)}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              padding: '0.3rem 0.5rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Hapus Order Pending"
          >
            <Trash2 size={13} />
            Hapus
          </button>
        </>
      )}
    </div>
  )
}
