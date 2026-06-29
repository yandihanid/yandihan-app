'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      }
    })
  }, [router, supabase])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.replace('/dashboard') // Use replace to prevent going back to login
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '1.5rem', textDecoration: 'none' }}>
          Yandihan
        </Link>
      </div>

      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: 'var(--text-main)', fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: '700' }}>Masuk Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Pantau laporan keuangan UMKM Anda</p>
        </div>
        
        <form onSubmit={handleLogin} className="flex flex-col">
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              className="input-field" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="bos@toko.com"
            />
          </div>
          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              className="input-field" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          
          {error && <div style={{ color: '#dc3545', fontSize: '0.875rem', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f8d7da', borderRadius: '4px' }}>{error}</div>}
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Memproses...' : (
              <>
                <LogIn size={18} style={{ marginRight: '8px' }} />
                Masuk
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Belum punya akun?{' '}
          <Link href="/signup" style={{ color: 'var(--primary-color)', fontWeight: '600' }}>
            Daftar sekarang
          </Link>
        </div>
      </div>
    </div>
  )
}
