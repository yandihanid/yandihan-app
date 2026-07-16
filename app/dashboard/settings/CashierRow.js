'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCashier } from './actions'

export default function CashierRow({ cashier }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window?.location?.origin || 'https://yandihan-app.vercel.app')
  }, [])

  const linkUrl = cashier.token
    ? `${origin}/c/${cashier.token}`
    : null

  const handleCopy = async () => {
    if (!linkUrl) return
    try {
      await navigator.clipboard.writeText(linkUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = linkUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Hapus kasir "${cashier.name || 'Tanpa Nama'}"? Tindakan ini tidak bisa dibatalkan.`)) return
    setDeleting(true)

    const formData = new FormData()
    formData.append('cashierId', cashier.id)
    const result = await deleteCashier(formData)

    if (result.error) {
      alert('Gagal menghapus: ' + result.error)
      setDeleting(false)
    } else {
      router.refresh()
    }
  }

  return (
    <tr>
      <td style={{ fontWeight: '500' }}>{cashier.name || 'Tanpa Nama'}</td>
      <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        {cashier.telegram_chat_id ? `Telegram (ID: ${cashier.telegram_chat_id})` : 'Hanya Web'}
      </td>
      <td>
        {cashier.token ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              readOnly
              value={`/c/${cashier.token}`}
              style={{
                padding: '0.35rem 0.6rem',
                fontSize: '0.8rem',
                width: '170px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: '#f8fafc',
                color: 'var(--text-muted)',
                fontFamily: 'monospace'
              }}
            />
            <button
              onClick={handleCopy}
              title="Salin link"
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: copied ? '#dcfce7' : 'white',
                color: copied ? '#16a34a' : 'var(--primary-color)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {copied ? '✓ Tersalin!' : '📋 Salin'}
            </button>
          </div>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tidak ada link</span>}
      </td>
      <td>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: '600',
            opacity: deleting ? 0.6 : 1
          }}
        >
          {deleting ? '...' : '🗑️ Hapus'}
        </button>
      </td>
    </tr>
  )
}
