/**
 * Tujuan link di email — file yang sebelumnya tidak ada (temuan K1).
 *
 * Sebelum ini `signUp()` dipanggil tanpa `emailRedirectTo`, dan halaman sukses
 * pendaftaran menyuruh pengguna membuka email verifikasi. Link di email itu
 * tidak punya tujuan di aplikasi ini, jadi alur "daftar -> verifikasi -> masuk"
 * berhenti di tengah dan pengguna baru tidak pernah sampai ke dashboard.
 *
 * Route handler ini menangani DUA bentuk link yang dikirim Supabase, karena
 * template email bisa memakai salah satunya dan kita tidak mengendalikannya
 * dari kode:
 *
 *   1. `?code=...`        alur PKCE. @supabase/ssr memaksa flowType 'pkce'
 *                         (createBrowserClient.js:37), jadi ini bentuk yang
 *                         dipakai link yang dipicu dari browser — termasuk
 *                         reset password. Ditukar lewat exchangeCodeForSession().
 *   2. `?token_hash=&type=`  template email bawaan Supabase yang lebih baru.
 *                         Ditukar lewat verifyOtp().
 *
 * Kenapa route handler dan bukan halaman: penukaran kode HARUS menulis cookie
 * sesi, dan Server Component tidak boleh menulis cookie — `catch {}` di
 * utils/supabase/server.js sengaja menelan percobaannya. Di route handler,
 * cookieStore.set() benar-benar tersimpan (route.md:125-151).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { safeNextPath } from '@/lib/safeNext'
import { authErrorMessage } from '@/lib/authErrors'

export async function GET(request) {
  const { searchParams, origin } = request.nextUrl

  // `next` divalidasi lewat safeNextPath: nilainya ikut bolak-balik di URL
  // email, jadi ia sama tidak dipercayanya dengan query string mana pun.
  // Tanpa penjaga itu, link verifikasi bisa dibuat mengarahkan korban ke
  // domain lain setelah sesinya terbentuk.
  const next = safeNextPath(searchParams.get('next'))

  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Supabase menaruh galatnya sendiri di URL kalau link-nya kedaluwarsa atau
  // sudah dipakai. Diperiksa lebih dulu supaya pesannya spesifik ("minta link
  // baru") alih-alih galat umum dari penukaran yang pasti gagal.
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')
  if (errorCode || errorDescription) {
    return redirectWithError(
      origin,
      authErrorMessage(
        { code: errorCode, message: errorDescription },
        'Link tidak valid atau sudah kedaluwarsa. Silakan minta link baru.'
      )
    )
  }

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return redirectWithError(
        origin,
        authErrorMessage(error, 'Link verifikasi tidak valid atau sudah kedaluwarsa.')
      )
    }
    return NextResponse.redirect(new URL(next, origin))
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      return redirectWithError(
        origin,
        authErrorMessage(error, 'Link verifikasi tidak valid atau sudah kedaluwarsa.')
      )
    }
    return NextResponse.redirect(new URL(next, origin))
  }

  // Dibuka tanpa parameter sama sekali — biasanya karena disalin sebagian dari
  // email. Tidak ada yang bisa ditukar; kembalikan ke login dengan penjelasan.
  return redirectWithError(origin, 'Link verifikasi tidak lengkap. Buka kembali link dari email Anda.')
}

/**
 * Pulang ke /login dengan pesan yang bisa dibaca pengguna.
 *
 * Pesannya lewat query string, bukan cookie flash: route ini adalah titik
 * pertama pengguna masuk dari luar aplikasi, jadi belum ada sesi tempat
 * menyimpan apa pun. Halaman login yang membacanya (dan hanya menampilkannya
 * sebagai teks, tidak pernah sebagai HTML).
 */
function redirectWithError(origin, message) {
  const url = new URL('/login', origin)
  url.searchParams.set('error', message)
  return NextResponse.redirect(url)
}
