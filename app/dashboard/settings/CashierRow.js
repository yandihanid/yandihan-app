'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Trash2 } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { deleteCashier, updateCashierAccount } from './actions'

/**
 * Satu akun kasir. Tidak ada link per baris lagi: semua akun memakai link toko
 * yang sama, dan username-lah yang membedakan siapa yang sedang login.
 */
export default function CashierRow({ cashier }) {
  const router = useRouter()
  const toast = useToast()
  const formId = `cashier-account-${cashier.id}`

  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(cashier.name || '')
  const [username, setUsername] = useState(cashier.username || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const label = cashier.name || 'Tanpa Nama'

  function openEdit() {
    setName(cashier.name || '')
    setUsername(cashier.username || '')
    setPassword('')
    setError('')
    setEditing(true)
  }

  async function handleSave(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')

    const formData = new FormData()
    formData.append('cashierId', cashier.id)
    formData.append('name', name)
    formData.append('username', username)
    formData.append('password', password)

    const result = await updateCashierAccount(formData)
    setBusy(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setEditing(false)
    toast.success(`Akun "${label}" diperbarui.`)
    router.refresh()
  }

  async function handleDelete() {
    setBusy(true)
    const formData = new FormData()
    formData.append('cashierId', cashier.id)
    const result = await deleteCashier(formData)
    setBusy(false)
    setConfirming(false)

    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Akun "${label}" dihapus.`)
    router.refresh()
  }

  return (
    <>
      <tr>
        <td>
          <strong>{label}</strong>
        </td>
        <td>
          <code className="cashier-username">{cashier.username || '—'}</code>
        </td>
        <td>
          {cashier.hasPassword ? (
            <Badge variant="success">Aktif</Badge>
          ) : (
            <Badge variant="warning">Atur kata sandi</Badge>
          )}
        </td>
        <td>
          <div className="cashier-actions">
            <Button variant="secondary" size="sm" onClick={openEdit} disabled={busy}>
              <KeyRound size={15} aria-hidden="true" />
              Atur akun
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirming(true)} disabled={busy}>
              <Trash2 size={15} aria-hidden="true" />
              Hapus
            </Button>
          </div>
        </td>
      </tr>

      <Modal
        open={editing}
        onClose={busy ? undefined : () => setEditing(false)}
        title={`Atur akun "${label}"`}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form={formId} size="sm" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </>
        }
      >
        <form id={formId} className="settings-form" onSubmit={handleSave}>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <label className="field" htmlFor={`${formId}-name`}>
            <span className="field-label">Nama kasir</span>
            <Input
              id={`${formId}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
            />
          </label>

          <label className="field" htmlFor={`${formId}-username`}>
            <span className="field-label">Username</span>
            <Input
              id={`${formId}-username`}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              maxLength={32}
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </label>

          <label className="field" htmlFor={`${formId}-password`}>
            <span className="field-label">Kata sandi baru</span>
            <Input
              id={`${formId}-password`}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Kosongkan jika tidak diubah"
            />
            <span className="field-hint">
              Isi hanya kalau kasir lupa kata sandi atau kata sandinya perlu diganti.
            </span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirming}
        title={`Hapus akun "${label}"?`}
        description={
          'Akun ini tidak bisa login lagi dan hilang dari daftar. Transaksi yang sudah ' +
          'tercatat tetap ada, tetapi tidak lagi menunjukkan nama kasir ini. Link toko ' +
          'dan akun kasir lain tidak terpengaruh.'
        }
        confirmLabel="Ya, hapus akun"
        busy={busy}
        onConfirm={handleDelete}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}
