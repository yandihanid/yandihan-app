import { NextResponse } from 'next/server'
import { verifyXenditCallbackToken } from '@/lib/xendit'
import { createServiceClient } from '@/utils/supabase/service'

/**
 * Callback Xendit untuk pencairan (disbursement).
 *
 * Xendit mengirim status pencairan melalui header `x-callback-token` dan body JSON.
 * Token ini dibandingkan dengan `XENDIT_CALLBACK_TOKEN` di env.
 * Jika status DISBURSED → tandai payout sebagai `paid`.
 * Jika status FAILED → tandai payout sebagai `failed` dengan alasan.
 * Jika status PENDING → jangan ub apa-apa (masih diproses bank).
 */
export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  // Invoice callback mengirim token statis di header `x-callback-token`.
  const callbackToken = req.headers.get('x-callback-token')

  if (!verifyXenditCallbackToken(callbackToken)) {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 })
  }

  const externalId = body.external_id || body.externalId
  if (!externalId) {
    return NextResponse.json({ error: 'external_id tidak ada di body' }, { status: 400 })
  }

  const supa = createServiceClient()
  const { data: payout, error: fetchError } = await supa
    .from('store_payouts')
    .select('*')
    .eq('external_id', externalId)
    .maybeSingle()

  if (fetchError || !payout) {
    return NextResponse.json(
      { error: 'Pencairan tidak ditemukan' },
      { status: 404 }
    )
  }

  // Jika sudah pernah dicairkan, abaikan request duplikat.
  if (payout.status === 'paid' || payout.status === 'failed') {
    return NextResponse.json(
      { status: payout.status, message: 'Sudah diproses' },
      { status: 200 }
    )
  }

  const status = body.status
  const failureReason = body.failure_reason || body.error_code || null

  if (status === 'DISBURSED') {
    await supa
      .from('store_payouts')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        failure_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payout.id)
  } else if (status === 'FAILED') {
    await supa
      .from('store_payouts')
      .update({
        status: 'failed',
        failure_reason: failureReason || 'Pencairan ditolak Xendit',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payout.id)
  } else if (status === 'PENDING') {
    // Masih diproses bank — tidak perlu mengubah status di sini.
  } else {
    // Status tidak dikenal — catat saja.
  }

  return NextResponse.json(
    { status: payout.status, message: 'Diperbarui' },
    { status: 200 }
  )
}