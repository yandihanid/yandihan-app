'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import Link from 'next/link'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 2000)
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
        
        {success ? (
          <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '8px', marginBottom: '1rem' }}>
            <p><strong>Pendaftaran Berhasil!</strong></p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Mengarahkan Anda ke Dashboard...</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>(Cek kotak masuk/spam email Anda jika Supabase meminta konfirmasi email).</p>
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
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
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
