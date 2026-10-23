import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { createServiceClient } from '@/utils/supabase/service'

// Otentikasi layar kasir.
//
// Modelnya sekarang dua lapis:
//   1. Link /c/<token> adalah identitas TOKO. Satu toko punya satu link,
//      berapa pun jumlah kasirnya.
//   2. Setiap orang yang membuka link itu harus login dengan username +
//      kata sandi. Hasil login disimpan sebagai sesi di cookie HttpOnly.
//
// Route handler tidak mempercayai store_id/cashier_id dari body. Keduanya
// diturunkan dari token link + sesi yang diverifikasi di server.
//
// Token link tetap dibaca dari HEADER, bukan query string: query string ikut
// tercatat di log proxy/CDN, ikut terkirim lewat Referer, dan ikut jadi bagian
// cache key service worker. Header tidak.

export const CASHIER_TOKEN_HEADER = 'x-cashier-token'
export const CASHIER_SESSION_COOKIE = 'yandihan_cashier_session'

// 7 hari cukup untuk satu shift kerja tanpa memaksa login ulang tiap hari,
// dan tetap membatasi cookie yang bocor.
export const CASHIER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

export const CASHIER_STORE_FIELDS =
  'id, name, cashier_token, subscription_tier, subscription_end_date, ' +
  'receipt_required, require_customer_name, waiting_list_enabled, ' +
  'pelanggan_enabled, visit_threshold, discount_percent'

export function readCashierToken(req) {
  const raw = req?.headers?.get?.(CASHIER_TOKEN_HEADER)
  if (!raw) return null
  const token = raw.trim()
  // Token yang kita terbitkan 32 karakter base64url; default DB 64 hex.
  // Batas atas hanya untuk menolak input sampah sebelum menyentuh DB.
  if (!token || token.length > 200) return null
  return token
}

export function readSessionToken(req) {
  const fromNext = req?.cookies?.get?.(CASHIER_SESSION_COOKIE)?.value
  if (fromNext) return fromNext

  const header = req?.headers?.get?.('cookie')
  if (!header) return null

  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    if (part.slice(0, separator).trim() !== CASHIER_SESSION_COOKIE) continue
    const value = part.slice(separator + 1).trim()
    return value || null
  }
  return null
}

/** Bucket rate limit tidak boleh memuat token mentah: tabel rate_limits
 *  menyimpan nama bucket apa adanya, jadi token akan ikut tersimpan. */
export function tokenBucket(prefix, token) {
  const digest = createHash('sha256').update(token).digest('hex').slice(0, 32)
  return `${prefix}:${digest}`
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function sessionExpiry() {
  return new Date(Date.now() + CASHIER_SESSION_TTL_SECONDS * 1000)
}

function authFailure(error, status) {
  return { error, status }
}

/** Toko dari token link. Token tak dikenal = null, bukan error 500. */
export async function resolveStoreByToken(token, columns = CASHIER_STORE_FIELDS) {
  const supabase = createServiceClient()
  if (!token) return { store: null, supabase }

  const { data, error } = await supabase
    .from('stores')
    .select(columns)
    .eq('cashier_token', token)
    .maybeSingle()

  if (error || !data) return { store: null, supabase }
  return { store: data, supabase }
}

async function findSession(supabase, rawSession) {
  if (!rawSession) return null

  const { data, error } = await supabase
    .from('cashier_sessions')
    .select('token_hash, cashier_id, store_id, expires_at')
    .eq('token_hash', hashSessionToken(rawSession))
    .maybeSingle()

  if (error || !data) return null

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    // Best effort; kalau gagal, sesi tetap ditolak oleh pemeriksaan di atas.
    await supabase.from('cashier_sessions').delete().eq('token_hash', data.token_hash)
    return null
  }

  return data
}

/**
 * Otorisasi tunggal untuk semua Route Handler kasir.
 *
 * `columns` adalah kolom tabel cashiers yang dibutuhkan pemanggil dan wajib
 * menyertakan id + store_id. Relasi stores!inner(...) juga boleh disertakan,
 * sama seperti sebelumnya.
 */
export async function authorizeCashier(request, columns = 'id, name, store_id') {
  const token = readCashierToken(request)
  if (!token) return authFailure('Token kasir diperlukan', 400)

  const rawSession = readSessionToken(request)
  if (!rawSession) {
    return authFailure('Sesi kasir berakhir. Silakan masuk kembali.', 401)
  }

  const { store, supabase } = await resolveStoreByToken(token, 'id')
  if (!store) return authFailure('Link kasir tidak valid', 404)

  const session = await findSession(supabase, rawSession)
  if (!session || session.store_id !== store.id) {
    return authFailure('Sesi kasir berakhir. Silakan masuk kembali.', 401)
  }

  const { data: cashier, error } = await supabase
    .from('cashiers')
    .select(columns)
    .eq('id', session.cashier_id)
    .eq('store_id', store.id)
    .maybeSingle()

  if (error || !cashier) {
    return authFailure('Akun kasir tidak ditemukan. Silakan masuk kembali.', 401)
  }

  return { token, cashier, store, session, supabase }
}

/**
 * Versi untuk Server Component /c/[token]: membaca cookie sesi lewat
 * next/headers, lalu mengembalikan store + cashier kalau keduanya cocok.
 */
export async function getCashierPageSession(token) {
  const { store, supabase } = await resolveStoreByToken(token)
  if (!store) return { store: null, cashier: null, supabase }

  const { cookies } = await import('next/headers')
  const rawSession = (await cookies()).get(CASHIER_SESSION_COOKIE)?.value
  if (!rawSession) return { store, cashier: null, supabase }

  const session = await findSession(supabase, rawSession)
  if (!session || session.store_id !== store.id) {
    return { store, cashier: null, supabase }
  }

  const { data: cashier } = await supabase
    .from('cashiers')
    .select('id, name, store_id')
    .eq('id', session.cashier_id)
    .eq('store_id', store.id)
    .maybeSingle()

  return { store, cashier: cashier ?? null, supabase }
}

export async function createCashierSession(supabase, { cashierId, storeId }) {
  const raw = createSessionToken()
  const expiresAt = sessionExpiry()

  const { error } = await supabase.from('cashier_sessions').insert({
    token_hash: hashSessionToken(raw),
    cashier_id: cashierId,
    store_id: storeId,
    expires_at: expiresAt.toISOString(),
  })

  if (error) return { token: null, expiresAt: null }

  // Bersihkan sesi kedaluwarsa milik kasir ini supaya tabel tidak tumbuh
  // tanpa batas. Sesi aktif di perangkat lain tidak disentuh.
  await supabase
    .from('cashier_sessions')
    .delete()
    .eq('cashier_id', cashierId)
    .lt('expires_at', new Date().toISOString())

  return { token: raw, expiresAt }
}

export async function deleteCashierSession(supabase, rawSession) {
  if (!rawSession) return
  await supabase
    .from('cashier_sessions')
    .delete()
    .eq('token_hash', hashSessionToken(rawSession))
}

export async function deleteCashierSessionsForCashier(supabase, cashierId) {
  if (!cashierId) return
  await supabase.from('cashier_sessions').delete().eq('cashier_id', cashierId)
}

export async function deleteCashierSessionsForStore(supabase, storeId) {
  if (!storeId) return
  await supabase.from('cashier_sessions').delete().eq('store_id', storeId)
}
