import Link from 'next/link'
import { SITE_NAME } from '@/lib/site'
import { getCurrentUser } from '@/lib/dal'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import ResetPasswordForm from './ResetPasswordForm'

/**
 * Langkah kedua reset password: tentukan password baru (temuan K2).
 *
 * Halaman ini hanya berguna kalau sesi pemulihan sudah terbentuk, dan itu
 * pekerjaan /auth/callback -- link di email membawa kode PKCE, callback
 * menukarnya jadi cookie sesi, lalu mengarahkan ke sini. Karena itu di sini
 * kita periksa sesinya dan menjelaskan keadaannya kalau tidak ada, bukan
 * merender form yang updateUser()-nya sudah pasti gagal.
 *
 * Halaman ini SENGAJA tidak masuk matcher proxy.js: proxy mengalihkan pengguna
 * yang punya sesi menjauh dari halaman auth, dan di sini punya sesi justru
 * prasyaratnya.
 *
 * getCurrentUser(), bukan verifySession(): kalau sesinya tidak ada, mengirim
 * pengguna ke /login tanpa penjelasan membuat orang yang baru mengklik link
 * dari email menyangka link-nya rusak. Lebih baik satu kalimat yang menyebut
 * sebabnya plus tombol minta link baru.
 */
export const metadata = {
  title: 'Buat Password Baru',
  description: `Tentukan password baru untuk akun ${SITE_NAME} Anda.`,
  robots: { index: false, follow: false },
}

export default async function ResetPasswordPage() {
  const user = await getCurrentUser()

  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand">
        {SITE_NAME}
      </Link>

      <div className="card auth-card animate-fade-in">
        <div className="auth-head">
          <h1>Buat Password Baru</h1>
          {user?.email ? (
            <p>
              Untuk akun <strong>{user.email}</strong>
            </p>
          ) : (
            <p>Link pemulihan sudah tidak berlaku</p>
          )}
        </div>

        {user ? (
          <ResetPasswordForm />
        ) : (
          <div className="auth-form">
            <Alert variant="warning" live={false}>
              Sesi pemulihan tidak ditemukan. Link reset hanya berlaku 1 jam dan hanya bisa
              dipakai sekali — kalau sudah lewat, minta link baru.
            </Alert>
            <Button href="/forgot-password" block>
              Minta Link Baru
            </Button>
          </div>
        )}

        <p className="auth-foot">
          <Link href="/login" className="auth-link">
            Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    </main>
  )
}
