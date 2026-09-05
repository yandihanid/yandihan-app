// Rate limiter sederhana berbasis tabel Postgres.
//
// Kenapa bukan counter di memori: setiap route di Vercel berjalan di instance
// serverless yang bisa berhenti atau berganti kapan saja, jadi counter proses
// praktis tidak pernah akurat. Tabel + fungsi atomik di
// supabase/migrations/0005_rate_limits.sql tahan restart dan tidak menambah
// dependensi baru.
import 'server-only'
import { createServiceClient } from '@/utils/supabase/service'

/**
 * IP pemanggil. Vercel selalu mengisi x-forwarded-for; entri pertama adalah
 * client asli. Header ini bisa dipalsukan di server lain, jadi jangan pakai
 * untuk otorisasi -- hanya untuk pengelompokan kuota.
 */
export function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

/**
 * @returns {Promise<{allowed: boolean, retryAfter: number}>}
 *
 * Catatan sengaja: kalau pemanggilan RPC-nya sendiri gagal (DB down), fungsi
 * ini FAIL OPEN. Alasannya webhook pembayaran: memblokir callback Midtrans
 * karena tabel rate limit tidak bisa dibaca akan menyebabkan pembayaran yang
 * sudah lunas tidak pernah tercatat -- kerugian yang lebih besar daripada
 * membiarkan beberapa request lolos selama gangguan.
 */
export async function checkRateLimit(bucket, { limit = 30, windowSeconds = 60 } = {}) {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('consume_rate_limit', {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })

    if (error) return { allowed: true, retryAfter: 0 }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) return { allowed: true, retryAfter: 0 }

    return {
      allowed: row.allowed !== false,
      retryAfter: Number(row.retry_after_seconds) || windowSeconds,
    }
  } catch {
    return { allowed: true, retryAfter: 0 }
  }
}

/** Response 429 standar, lengkap dengan Retry-After supaya klien tahu harus menunggu. */
export function tooManyRequests(retryAfter, message = 'Terlalu banyak permintaan. Coba lagi nanti.') {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      'content-type': 'application/json',
      'retry-after': String(Math.max(1, Number(retryAfter) || 60)),
    },
  })
}
