'use client'

import { Download } from 'lucide-react'

export default function OrderActionRow({ order }) {
  return (
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
      Invoice
    </a>
  )
}