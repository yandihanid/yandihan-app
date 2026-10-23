import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import {
  CASHIER_SESSION_COOKIE,
  deleteCashierSession,
  readSessionToken,
} from '@/lib/cashierAuth'

const NO_STORE = { 'cache-control': 'private, no-store' }

export async function POST(req) {
  const rawSession = readSessionToken(req)

  if (rawSession) {
    const supabase = createServiceClient()
    await deleteCashierSession(supabase, rawSession)
  }

  const response = NextResponse.json({ success: true }, { headers: NO_STORE })
  response.cookies.set(CASHIER_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
