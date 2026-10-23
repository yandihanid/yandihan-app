'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, Store } from 'lucide-react'

export default function LoginForm({ token, storeName }) {
  const router = useRouter()
  const usernameId = useId()
  const passwordId = useId()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending) return
    setError('')
    setPending(true)

    try {
      const response = await fetch('/api/cashier/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, username, password }),
      })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        setError(body?.error || 'Gagal masuk. Coba lagi.')
        setPending(false)
        return
      }

      // Cookie sesi sudah dipasang oleh route login. Refresh Server Component
      // supaya layar kasir dirender dengan sesi baru tanpa reload penuh.
      router.refresh()
    } catch {
      setError('Tidak ada koneksi. Coba lagi setelah online.')
      setPending(false)
    }
  }

  return (
    <main className="cashier-gate">
      <section className="card cashier-login" aria-labelledby="cashier-login-title">
        <div className="cashier-login-icon" aria-hidden="true">
          <Store size={26} />
        </div>

        <div className="cashier-login-head">
          <p className="cashier-login-eyebrow">Kasir</p>
          <h1 id="cashier-login-title">{storeName || 'Toko'}</h1>
          <p>Masuk dengan username dan kata sandi yang diberikan pemilik toko.</p>
        </div>

        <form className="cashier-login-form" onSubmit={handleSubmit}>
          <label className="field" htmlFor={usernameId}>
            <span className="field-label">Username</span>
            <input
              id={usernameId}
              className="input"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              autoFocus
            />
          </label>

          <label className="field" htmlFor={passwordId}>
            <span className="field-label">Kata sandi</span>
            <span className="cashier-password">
              <input
                id={passwordId}
                className="input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="cashier-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {error && (
            <p className="cashier-login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary cashier-login-submit" disabled={pending}>
            <LogIn size={18} aria-hidden="true" />
            {pending ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>

        <p className="cashier-login-foot">
          Lupa kata sandi? Hubungi pemilik toko untuk mengatur ulang.
        </p>
      </section>
    </main>
  )
}
