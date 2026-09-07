'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MailCheck, UserPlus } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { authErrorMessage } from '@/lib/authErrors'
import { SITE_URL } from '@/lib/site'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'

const MIN_PASSWORD = 6

/**
 * Island form pendaftaran.
 *
 * Perbaikan intinya satu baris: `options.emailRedirectTo` (temuan K1). Tanpa
 * itu link di email verifikasi tidak punya tujuan di aplikasi ini, sehingga
 * halaman ini menyuruh pengguna membuka email yang link-nya tidak berfungsi.
 * Tujuannya /auth/callback, route handler yang menukar kode jadi sesi.
 *
 * SITE_URL dipakai, bukan window.location.origin: alamat itu ikut masuk ke
 * email yang bisa dibuka jam berikutnya di perangkat lain, jadi ia harus alamat
 * kanonik aplikasi -- bukan host apa pun yang kebetulan dipakai saat mendaftar
 * (mis. preview deployment atau IP LAN saat dev).
 */
export default function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sentTo, setSentTo] = useState(null)
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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${SITE_URL}/auth/callback?next=/dashboard`,
        },
      })

      if (signUpError) {
        setError(authErrorMessage(signUpError, 'Gagal mendaftar. Coba lagi sebentar.'))
        setLoading(false)
        return
      }

      if (data.session) {
        // Konfirmasi email dinonaktifkan di project ini: sesinya langsung ada,
        // jadi tidak ada alasan menahan pengguna di halaman ini.
        router.replace('/dashboard')
        router.refresh()
        return
      }

      setSentTo(email)
      setLoading(false)
    } catch (err) {
      setError(authErrorMessage(err))
      setLoading(false)
    }
  }

  if (sentTo) {
    return (
      <div className="auth-sent">
        <MailCheck size={40} aria-hidden="true" />
        <h2>Cek email Anda</h2>
        <p>
          Link verifikasi sudah dikirim ke <strong>{sentTo}</strong>. Buka link itu untuk
          mengaktifkan akun — Anda akan langsung masuk ke dashboard.
        </p>
        <p className="auth-sent-hint">
          Tidak ada di kotak masuk? Periksa folder spam atau promosi. Link berlaku 1 jam.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <Field id="email" label="Email">
        {(props) => (
          <Input
            {...props}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="bos@toko.com"
            required
          />
        )}
      </Field>

      <Field id="password" label="Password" hint={`Minimal ${MIN_PASSWORD} karakter`}>
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

      <Field id="confirmPassword" label="Konfirmasi Password">
        {(props) => (
          <Input
            {...props}
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ketik ulang password Anda"
            required
          />
        )}
      </Field>

      {error && <Alert variant="error">{error}</Alert>}

      <Button type="submit" block disabled={loading}>
        {loading ? (
          'Memproses...'
        ) : (
          <>
            <UserPlus size={18} aria-hidden="true" />
            Daftar Sekarang
          </>
        )}
      </Button>
    </form>
  )
}
