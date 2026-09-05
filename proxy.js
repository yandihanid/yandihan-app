// Next 16: file ini bernama `proxy.js`, bukan `middleware.js`.
// Konvensi `middleware` sudah deprecated dan di-rename menjadi `proxy`
// (lihat node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
//
// Tugas file ini HANYA dua:
//   1. Me-refresh sesi Supabase (menulis ulang cookie auth) supaya Server
//      Component tidak pernah merender dengan token kedaluwarsa. Ini yang
//      membuat `catch {}` di utils/supabase/server.js benar.
//   2. Gate OPTIMISTIK: pengunjung tanpa cookie sesi tidak usah dirender
//      halaman dashboard, dan yang sudah login tidak usah melihat /login.
//
// Yang TIDAK boleh diandalkan di sini: otorisasi. Proxy dijalankan terpisah
// dari kode render, dan matcher yang mengecualikan sebuah path juga ikut
// mengecualikan Server Function yang di-POST ke path itu (proxy.md:217-219).
// Karena itu setiap pemeriksaan kepemilikan tetap wajib ada di lib/dal.js.
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SUPABASE_COOKIE_OPTIONS } from './utils/supabase/cookieOptions'

const PROTECTED_PREFIX = '/dashboard'
const AUTH_PAGES = ['/login', '/signup']

export async function proxy(request) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
          // @supabase/ssr mengirim header no-store bersama cookie auth.
          // Wajib diteruskan: tanpa ini CDN bisa meng-cache response yang
          // membawa Set-Cookie dan menyajikan sesi satu user ke user lain.
          for (const [key, headerValue] of Object.entries(headers ?? {})) {
            response.headers.set(key, headerValue)
          }
        },
      },
    }
  )

  // getUser() menghubungi Auth server, jadi token yang kedaluwarsa
  // ikut di-refresh di sini. getSession() tidak diverifikasi -> jangan dipakai.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  if (!user && pathname.startsWith(PROTECTED_PREFIX)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', pathname + search)
    return redirectPreservingCookies(url, response)
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return redirectPreservingCookies(url, response)
  }

  return response
}

// Redirect membuat response baru, jadi cookie hasil refresh harus
// dipindahkan manual. Kalau tidak, sesi yang baru di-refresh hilang
// dan user bisa terjebak loop redirect.
function redirectPreservingCookies(url, carrier) {
  const redirect = NextResponse.redirect(url)
  carrier.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}

export const config = {
  // Daftar positif: cukup untuk refresh sesi + gate, tanpa menambah
  // round-trip Supabase ke landing page, /c/[token], /r/[id], dan webhook.
  matcher: ['/dashboard/:path*', '/login', '/signup'],
}
