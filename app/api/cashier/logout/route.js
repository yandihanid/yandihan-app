import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import {
  deleteCashierSession,
  readSessionToken,
  clearSessionCookie,
} from '@/lib/cashierAuth'

const NO_STORE = { 'cache-control': 'private, no-store' }

export async function POST(req) {
  const rawSession = readSessionToken(req)

  if (rawSession) {
    const supabase = createServiceClient()
    await deleteCashierSession(supabase, rawSession)
  }

  const response = NextResponse.json({ success: true }, { headers: NO_STORE })
  clearSessionCookie(response)
  return response
}
