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

export function deviceBindingError(cashier, deviceId) {
  if (!deviceId) {
    return 'Penyimpanan browser harus diizinkan agar perangkat kasir dapat diverifikasi.'
  }
  if (!cashier?.device_id) return null
  if (cashier.device_id === deviceId) return null
  return 'Link kasir ini sudah dipakai di perangkat lain. Minta pemilik toko mereset token.'
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

function authFailure(error, status) {
  return { error, status }
}

/**
 * Otorisasi tunggal untuk semua Route Handler kasir.
 *
 * Klaim perangkat pertama memakai UPDATE bersyarat `device_id is null`, jadi
 * dua perangkat yang datang bersamaan tidak dapat sama-sama menang. Kalau
 * UPDATE kalah balapan, nilai terbaru dibaca ulang lalu diverifikasi.
 * `columns` wajib menyertakan id, store_id, dan device_id.
 */
export async function authorizeCashier(
  request,
  columns = 'id, name, store_id, device_id'
) {
  const token = readCashierToken(request)
  if (!token) return authFailure('Token kasir diperlukan', 400)

  const deviceId = readDeviceId(request)
  if (!deviceId) return authFailure(deviceBindingError(null, deviceId), 403)

  const { cashier, supabase } = await resolveCashier(token, columns)
  if (!cashier) return authFailure('Link kasir tidak valid', 404)

  const bindingError = deviceBindingError(cashier, deviceId)
  if (bindingError) return authFailure(bindingError, 403)
  if (cashier.device_id) return { token, cashier, supabase }

  const { data: claimed, error: claimError } = await supabase
    .from('cashiers')
    .update({ device_id: deviceId })
    .eq('id', cashier.id)
    .is('device_id', null)
    .select('device_id')
    .maybeSingle()

  if (claimError) return authFailure('Gagal memverifikasi perangkat kasir', 500)
  if (claimed?.device_id === deviceId) {
    return { token, cashier: { ...cashier, device_id: deviceId }, supabase }
  }

  const { data: current, error: currentError } = await supabase
    .from('cashiers')
    .select('device_id')
    .eq('id', cashier.id)
    .maybeSingle()

  if (currentError || !current) {
    return authFailure('Gagal memverifikasi perangkat kasir', 500)
  }

  const claimLostError = deviceBindingError(current, deviceId)
  if (claimLostError) return authFailure(claimLostError, 403)

  return { token, cashier: { ...cashier, device_id: current.device_id }, supabase }
}
