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
    setOrigin(window.location.origin)
  }, [])

  const linkUrl = cashier.token ? `${origin}/c/${cashier.token}` : ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(linkUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    if (!confirm(`Hapus kasir "${cashier.name || 'Tanpa Nama'}"?`)) return
    setDeleting(true)
    const fd = new FormData()
    fd.append('cashierId', cashier.id)
    const res = await deleteCashier(fd)
    if (res.error) alert(res.error)
    else router.refresh()
  }

  return (
    <tr>
      <td>{cashier.name || 'Tanpa Nama'}</td>
      <td>{cashier.telegram_chat_id ? `Telegram (${cashier.telegram_chat_id})` : 'Web'}</td>
      <td>
        {cashier.token ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input readOnly value={`/c/${cashier.token}`} style={{ width: 170, padding: '0.35rem', fontSize: '0.8rem' }} />
            <button onClick={handleCopy}>{copied ? 'Tersalin' : 'Salin'}</button>
          </div>
        ) : '—'}
      </td>
      <td>
        <button onClick={handleDelete} disabled={deleting}>🗑️ Hapus</button>
      </td>
    </tr>
  )
}
