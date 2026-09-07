'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { authErrorMessage } from '@/lib/authErrors'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'

/**
 * Island form login.
 *
 * Tiga hal yang berubah dari versi sebelumnya, semuanya bukan kosmetik:
 *
 *   1. `next` dihormati (temuan K3). Dulu selalu `router.replace('/dashboard')`,
 *      jadi klik link ke /dashboard/laporan sambil logout berakhir di Ringkasan.
 *      Nilainya sudah divalidasi di page.js lewat safeNextPath().
 *   2. Pesan galat berbahasa Indonesia lewat authErrorMessage(), bukan
 *      `error.message` mentah dari Supabase.
 *   3. `autoComplete` yang benar, dan galat diumumkan pembaca layar lewat
 *      Alert (role="alert"). Tanpa itu pengguna menekan Masuk, tidak terjadi
 *      apa-apa yang terdengar, dan tidak ada cara tahu kenapa.
 */
export default function LoginForm({ next, notice }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError(authErrorMessage(signInError, 'Gagal masuk. Coba lagi sebentar.'))
        setLoading(false)
        return
      }

      // replace(), bukan push(): tombol Back setelah masuk seharusnya tidak
      // membawa pengguna balik ke halaman login yang sudah tidak berlaku.
      // refresh() menyusul supaya Server Component di tujuan ikut dirender
      // ulang dengan cookie sesi yang baru.
      router.replace(next)
      router.refresh()
    } catch (err) {
      setError(authErrorMessage(err))
      setLoading(false)
    }
  }

  // Pesan dari /auth/callback ditampilkan sampai pengguna mencoba masuk;
  // setelah itu galat form yang lebih baru menggantikannya.
  const message = error ?? notice

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

      <Field id="password" label="Password">
        {(props) => (
          <Input
            {...props}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        )}
      </Field>

      <p className="auth-aside">
        <Link href="/forgot-password" className="auth-link">
          Lupa password?
        </Link>
      </p>

      {message && <Alert variant="error">{message}</Alert>}

      <Button type="submit" block disabled={loading}>
        {loading ? (
          'Memproses...'
        ) : (
          <>
            <LogIn size={18} aria-hidden="true" />
            Masuk
          </>
        )}
      </Button>
    </form>
  )
}
