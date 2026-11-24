import { NextResponse } from 'next/server'

/**
 * Health check endpoint untuk monitoring uptime dan kesiapan aplikasi.
 *
 * Dipakai oleh load balancer, monitoring tools (UptimeRobot, Datadog, dll.),
 * dan CI/CD untuk memastikan aplikasi siap melayani trafik.
 *
 * Response contoh:
 *   {
 *     "status": "ok",
 *     "timestamp": "2026-11-24T08:00:00.000Z",
 *     "version": "0.1.0",
 *     "checks": {
 *       "database": "ok",
 *       "supabase": "ok"
 *     }
 *   }
 */
export async function GET() {
  const checks = {}
  let overall = 'ok'

  // Cek koneksi Supabase (anon key, hanya cek apakah reachable)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      checks.supabase = res.ok ? 'ok' : 'error'
      if (!res.ok) overall = 'degraded'
    } else {
      checks.supabase = 'not_configured'
      overall = 'degraded'
    }
  } catch {
    checks.supabase = 'unreachable'
    overall = 'degraded'
  }

  // Cek environment variabel kritis
  checks.env = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  }

  const statusCode = overall === 'ok' ? 200 : 503

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      checks,
    },
    { status: statusCode },
  )
}
