'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { authErrorMessage } from '@/lib/authErrors'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'

const MIN_PASSWORD = 6

/**
 * Simpan password baru lewat updateUser().
 *
 * Setelah berhasil, pengguna TIDAK diarahkan ke /login: sesi pemulihannya masih
 * berlaku dan sudah menjadi sesi penuh, jadi memaksa masuk lagi hanya menambah
 * satu langkah tanpa menambah keamanan. Yang dikirim adalah /dashboard.
 *
 * router.refresh() dipanggil setelah replace() supaya Server Component di
 * tujuan membaca cookie sesi yang baru; tanpa itu, halaman tujuan bisa dirender
 * dari cache router dengan keadaan auth yang lama.
 */
export default function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD) {
      setError(`Password minimal ${MIN_PASSWORD} karakter.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(authErrorMessage(updateError, 'Gagal menyimpan password baru. Coba lagi.'))
        setLoading(false)
        return
      }

      router.replace('/dashboard')
      router.refresh()
    } catch (err) {
      setError(authErrorMessage(err))
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <Field id="password" label="Password baru" hint={`Minimal ${MIN_PASSWORD} karakter`}>
        {(props) => (
          <Input
            {...props}
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        )}
      </Field>

      <Field id="confirmPassword" label="Konfirmasi password baru">
        {(props) => (
          <Input
            {...props}
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ketik ulang password baru"
            required
          />
        )}
      </Field>

      {error && <Alert variant="error">{error}</Alert>}

      <Button type="submit" block disabled={loading}>
        {loading ? (
          'Menyimpan...'
        ) : (
          <>
            <KeyRound size={18} aria-hidden="true" />
            Simpan Password Baru
          </>
        )}
      </Button>
    </form>
  )
}
