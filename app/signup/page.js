'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import Link from 'next/link'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('') // State baru
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [signUpSuccess, setSignUpSuccess] = useState(false) // State baru untuk sukses pendaftaran
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false) // State baru untuk verifikasi email
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

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSignUpSuccess(false) // Reset
    setRequiresEmailVerification(false) // Reset

    // Client-side validation
    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      setLoading(false)
      return
    }
    
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
    } else {
      setSignUpSuccess(true) // Pendaftaran berhasil dikirim
      setLoading(false)
      if (data.session) {
        // Pengguna langsung login (misal: konfirmasi email dinonaktifkan)
        setTimeout(() => {
          router.replace('/dashboard') // Use replace to prevent going back to signup
          router.refresh()
        }, 2000)
      } else {
        // Konfirmasi email diperlukan
        setRequiresEmailVerification(true)
      }
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
          <h1 style={{ color: 'var(--text-main)', fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: '700' }}>Buat Akun</h1>
          <p style={{ color: 'var(--text-muted)' }}>Mulai kelola keuangan UMKM Anda</p>
        </div>
        
        {signUpSuccess ? (
          <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '8px', marginBottom: '1rem' }}>
            <p><strong>Pendaftaran Berhasil!</strong></p>
            {requiresEmailVerification ? (
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Silakan cek kotak masuk/spam email Anda untuk verifikasi akun, lalu masuk ke dashboard.</p>
            ) : (
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Mengarahkan Anda ke Dashboard...</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSignUp} className="flex flex-col">
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
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input 
                id="password"
                type="password" 
                className="input-field" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Minimal 6 karakter"
                minLength="6"
              />
            </div>
            {/* Input konfirmasi password baru */}
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="confirmPassword">Konfirmasi Password</label>
              <input 
                id="confirmPassword"
                type="password" 
                className="input-field" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Ketik ulang password Anda"
                minLength="6"
              />
            </div>
            
            {error && <div style={{ color: '#dc3545', fontSize: '0.875rem', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f8d7da', borderRadius: '4px' }}>{error}</div>}
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Memproses...' : (
                <>
                  <UserPlus size={18} style={{ marginRight: '8px' }} />
                  Daftar Sekarang
                </>
              )}
            </button>
          </form>
        )}
        
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Sudah punya akun?{' '}
          <Link href="/login" style={{ color: 'var(--primary-color)', fontWeight: '600' }}>
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  )
}
