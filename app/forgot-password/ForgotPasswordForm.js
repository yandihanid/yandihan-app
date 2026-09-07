'use client'

import { useState } from 'react'
import { MailCheck, Send } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { authErrorMessage } from '@/lib/authErrors'
import { SITE_URL } from '@/lib/site'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'

/**
 * Kirim email reset password.
 *
 * Satu keputusan yang sengaja: layar sukses ditampilkan bahkan kalau alamatnya
 * tidak terdaftar, dan kalimatnya tidak menegaskan bahwa akunnya ada. Kalau
 * halaman ini membalas "akun tidak ditemukan", ia jadi alat untuk mengecek
 * email mana yang punya akun di sini (user enumeration). Supabase sendiri
 * sudah membalas sukses untuk alamat tak dikenal; UI-nya harus konsisten
 * dengan itu, kalau tidak perbedaan waktu balasan pun bocor.
 *
 * redirectTo menunjuk /auth/callback dengan `next=/reset-password`: link email
 * membawa kode PKCE yang harus ditukar jadi sesi lebih dulu, dan baru setelah
 * sesi itu ada, updateUser({ password }) di /reset-password bisa berhasil.
 */
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
      })

      // Galat rate-limit tetap ditampilkan: itu tentang permintaannya, bukan
      // tentang ada-tidaknya akun, jadi tidak membocorkan apa pun.
      if (resetError) {
        setError(authErrorMessage(resetError, 'Gagal mengirim link reset. Coba lagi sebentar.'))
        setLoading(false)
        return
      }

      setSent(true)
      setLoading(false)
    } catch (err) {
      setError(authErrorMessage(err))
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="auth-sent">
        <MailCheck size={40} aria-hidden="true" />
        <h2>Link sudah dikirim</h2>
        <p>
          Kalau <strong>{email}</strong> terdaftar, link untuk membuat password baru sudah
          masuk ke kotak masuknya.
        </p>
        <p className="auth-sent-hint">
          Periksa juga folder spam. Link berlaku 1 jam dan hanya bisa dipakai sekali.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <Field id="email" label="Email akun">
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

      {error && <Alert variant="error">{error}</Alert>}

      <Button type="submit" block disabled={loading}>
        {loading ? (
          'Mengirim...'
        ) : (
          <>
            <Send size={18} aria-hidden="true" />
            Kirim Link Reset
          </>
        )}
      </Button>
    </form>
  )
}
