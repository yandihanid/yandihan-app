import Link from 'next/link'
import { SITE_NAME } from '@/lib/site'
import SignUpForm from './SignUpForm'

/**
 * Halaman daftar. Sama seperti /login: shell-nya Server Component, hanya
 * formnya island. Efek `getSession()` yang dulu ada di sini dihapus -- proxy.js
 * sudah menggerbangi /signup untuk pengguna yang sudah masuk.
 */
export const metadata = {
  title: 'Daftar',
  description: `Buat akun ${SITE_NAME} gratis: catat penjualan dari HP, stok berkurang otomatis, laporan harian siap dibaca.`,
  robots: { index: false, follow: false },
}

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand">
        {SITE_NAME}
      </Link>

      <div className="card auth-card animate-fade-in">
        <div className="auth-head">
          <h1>Buat Akun</h1>
          <p>Gratis, tanpa batas jumlah transaksi</p>
        </div>

        <SignUpForm />

        <p className="auth-foot">
          Sudah punya akun?{' '}
          <Link href="/login" className="auth-link">
            Masuk di sini
          </Link>
        </p>
      </div>
    </main>
  )
}
