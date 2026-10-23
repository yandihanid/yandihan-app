import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { verifyPassword } from '@/lib/password'
import { normalizeUsername, validateUsername } from '@/lib/cashierAccount'
import {
  CASHIER_SESSION_COOKIE,
  CASHIER_SESSION_TTL_SECONDS,
  createCashierSession,
  tokenBucket,
  setSessionCookie,
} from '@/lib/cashierAuth'
import { checkRateLimit, tooManyRequests, clientIp } from '@/lib/rateLimit'

const NO_STORE = { 'cache-control': 'private, no-store' }

function jsonError(error, status) {
  return NextResponse.json({ error }, { status, headers: NO_STORE })
}

export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return jsonError('Permintaan tidak valid.', 400)
  }

  const token = String(body?.token || '').trim()
  const username = normalizeUsername(body?.username)
  const password = String(body?.password || '')

  if (!token || token.length > 200) return jsonError('Link kasir tidak valid.', 404)
  if (validateUsername(username)) return jsonError('Username atau kata sandi salah.', 401)
  if (!password) return jsonError('Username atau kata sandi salah.', 401)

  const ip = clientIp(req)
  const perIp = await checkRateLimit(`cashier:login:ip:${ip}`, {
    limit: 12,
    windowSeconds: 300,
  })
  if (!perIp.allowed) return tooManyRequests(perIp.retryAfter)

  const perToken = await checkRateLimit(tokenBucket('cashier:login:token', token), {
    limit: 30,
    windowSeconds: 300,
  })
  if (!perToken.allowed) return tooManyRequests(perToken.retryAfter)

  const supabase = createServiceClient()

  // Token link mengidentifikasi TOKO. Satu toko boleh punya banyak akun kasir;
  // username yang menentukan siapa yang sedang masuk.
  const { data: store } = await supabase
    .from('stores')
    .select('id, name')
    .eq('cashier_token', token)
    .maybeSingle()

  if (!store) return jsonError('Link kasir tidak valid.', 404)

  const { data: cashier } = await supabase
    .from('cashiers')
    .select('id, name, username, password_hash')
    .eq('store_id', store.id)
    .ilike('username', username)
    .maybeSingle()

  // Pesan sengaja sama untuk username tidak ada dan kata sandi salah, supaya
  // halaman login tidak bisa dipakai menebak daftar username toko.
  if (!cashier || !verifyPassword(password, cashier.password_hash)) {
    return jsonError('Username atau kata sandi salah.', 401)
  }

  const session = await createCashierSession(supabase, {
    cashierId: cashier.id,
    storeId: store.id,
  })

  if (!session.token) {
    console.error('Gagal membuat sesi kasir', { cashierId: cashier.id })
    return jsonError('Gagal membuat sesi login. Coba lagi.', 500)
  }

  const response = NextResponse.json(
    {
      success: true,
      cashier: { id: cashier.id, name: cashier.name },
      store: { id: store.id, name: store.name },
    },
    { headers: NO_STORE }
  )

  setSessionCookie(response, session.token)

  return response
}
