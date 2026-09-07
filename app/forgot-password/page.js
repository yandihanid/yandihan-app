import Link from 'next/link'
import { SITE_NAME } from '@/lib/site'
import ForgotPasswordForm from './ForgotPasswordForm'

/**
 * Minta link reset password (temuan K2).
 *
 * Sebelum halaman ini ada, pengguna yang lupa password kehilangan akunnya
 * secara permanen: tidak ada reset, dan tidak ada link "Lupa password?" di
 * halaman login. Untuk aplikasi yang isinya catatan penjualan satu toko, itu
 * berarti data yang tidak bisa diambil kembali.
 */
export const metadata = {
  title: 'Lupa Password',
  description: `Minta link untuk membuat password baru akun ${SITE_NAME} Anda.`,
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand">
        {SITE_NAME}
      </Link>

      <div className="card auth-card animate-fade-in">
        <div className="auth-head">
          <h1>Lupa Password</h1>
          <p>Masukkan email akun Anda, kami kirimkan link untuk membuat password baru</p>
        </div>

        <ForgotPasswordForm />

        <p className="auth-foot">
          Ingat password Anda?{' '}
          <Link href="/login" className="auth-link">
            Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    </main>
  )
}
