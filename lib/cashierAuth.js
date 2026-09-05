import 'server-only'
import { createHash } from 'node:crypto'
import { createServiceClient } from '@/utils/supabase/service'

// Kasir tidak punya akun Supabase: satu-satunya kredensialnya adalah token di
// link /c/<token>. Semua route handler yang dipakai layar kasir memverifikasi
// token itu di sini, lewat service client (RLS dilewati), lalu MENURUNKAN
// store_id dari hasil lookup -- tidak pernah dari input client (temuan A1).
//
// Token dibaca dari HEADER, bukan query string. Query string ikut tercatat di
// log proxy/CDN, ikut terkirim lewat Referer, dan ikut jadi bagian cache key
// service worker. Header tidak.

export const CASHIER_TOKEN_HEADER = 'x-cashier-token'
export const DEVICE_ID_HEADER = 'x-device-id'

export function readCashierToken(req) {
  const raw = req.headers.get(CASHIER_TOKEN_HEADER)
  if (!raw) return null
  const token = raw.trim()
  // Token yang kita terbitkan 32 karakter base64url; default DB 64 hex.
  // Batas atas hanya untuk menolak input sampah sebelum menyentuh DB.
  if (!token || token.length > 200) return null
  return token
}

export function readDeviceId(req) {
  const raw = req.headers.get(DEVICE_ID_HEADER)
  if (!raw) return null
  const id = raw.trim()
  if (!id || id.length > 100) return null
  return id
}

/** Bucket rate limit tidak boleh memuat token mentah: tabel rate_limits
 *  menyimpan nama bucket apa adanya, jadi token akan ikut tersimpan. */
export function tokenBucket(prefix, token) {
  const digest = createHash('sha256').update(token).digest('hex').slice(0, 32)
  return `${prefix}:${digest}`
}

/**
 * Mencari kasir dari token. Mengembalikan { cashier, supabase } dengan
 * cashier = null kalau token tidak dikenal.
 */
export async function resolveCashier(token, columns = 'id, name, store_id, device_id') {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('cashiers')
    .select(columns)
    .eq('token', token)
    .maybeSingle()

  if (error || !data) return { cashier: null, supabase }
  return { cashier: data, supabase }
}
