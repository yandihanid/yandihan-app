import Link from 'next/link'
import { SITE_NAME } from '@/lib/site'
import { safeNextPath } from '@/lib/safeNext'
import LoginForm from './LoginForm'

/**
 * Halaman login. Server Component tipis: yang butuh state hanyalah formnya,
 * jadi hanya form itu yang jadi island ('use client' di LoginForm.js).
 *
 * Efek `getSession()` yang dulu ada di sini sudah dihapus. Pengalihan pengguna
 * yang sudah masuk dikerjakan proxy.js (matcher-nya mencakup /login), dan
 * getSession() di browser tidak diverifikasi ke Auth server -- jadi efek itu
 * bukan hanya redundan, ia juga sumber kebenaran yang lebih lemah.
 *
 * `next` dan `error` dibaca di sini lewat prop `searchParams`, bukan dengan
 * useSearchParams() di dalam form. Alasannya ada di dokumen Next:
 * useSearchParams() memaksa seluruh subtree client sampai batas <Suspense>
 * terdekat dirender di browser (use-search-params.md:82-86), padahal nilai ini
 * sudah tersedia di server. Konsekuensinya halaman ini dirender per-permintaan,
 * dan itu memang benar untuk halaman login.
 */
export const metadata = {
  title: 'Masuk',
  description: `Masuk ke dashboard ${SITE_NAME} untuk memantau penjualan dan laporan keuangan toko Anda.`,
  // Halaman auth tidak punya isi yang berguna di hasil pencarian, dan
  // /login?next=... bisa menghasilkan URL tak terhingga banyaknya.
  robots: { index: false, follow: false },
}

export default async function LoginPage({ searchParams }) {
  const params = (await searchParams) || {}

  // Divalidasi DI SINI, bukan di dalam form: dengan begitu tidak ada jalur di
  // mana nilai mentah dari URL sempat sampai ke router.
  const next = safeNextPath(params.next)

  // Pesan dari /auth/callback (link email kedaluwarsa, dsb). Dirender sebagai
  // teks biasa oleh React, jadi isinya tidak bisa jadi markup.
  const notice = typeof params.error === 'string' ? params.error.slice(0, 300) : null

  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand">
        {SITE_NAME}
      </Link>

      <div className="card auth-card animate-fade-in">
        <div className="auth-head">
          <h1>Masuk Dashboard</h1>
          <p>Pantau penjualan dan laporan keuangan toko Anda</p>
        </div>

        <LoginForm next={next} notice={notice} />

        <p className="auth-foot">
          Belum punya akun?{' '}
          <Link href="/signup" className="auth-link">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </main>
  )
}
