import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { verifyXenditCallbackToken, isXenditPaidStatus } from '@/lib/xendit'
import { checkRateLimit, tooManyRequests, clientIp } from '@/lib/rateLimit'

export async function POST(req) {
  const ip = clientIp(req)

  const rate = await checkRateLimit(`xendit:callback:${ip}`, { limit: 60, windowSeconds: 60 })
  if (!rate.allowed) return tooManyRequests(rate.retryAfter)

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  // Invoice callback mengirim token statis di header `x-callback-token`.
  const callbackToken = req.headers.get('x-callback-token')

  if (!verifyXenditCallbackToken(callbackToken)) {
    return NextResponse.json({ error: 'Signature tidak valid' }, { status: 401 })
  }

  // Status selain PAID/SETTLED tidak perlu tindakan
  // Tetap balas 200 supaya Xendit berhenti mengirim ulang notifikasi
  if (!isXenditPaidStatus(body)) {
    return NextResponse.json({ message: 'Diterima, belum lunas' }, { status: 200 })
  }

  const service = createServiceClient()
  const { data: order } = await service
    .from('subscription_orders')
    .select('plan, amount, store_id')
    .eq('order_id', body.external_id)
    .maybeSingle()

  const days = order?.plan === 'PRO_ANNUAL' || Number(order?.amount) >= 700000 ? 365 : 30
  const isOnTableAddon =
    /on.?table|addon/i.test(String(order?.plan || '')) ||
    Number(order?.amount) === 50000

  if (isOnTableAddon) {
    // Add-on tidak mengubah masa langganan; cukup tandai lunas dan aktifkan fitur.
    if (Number(body.amount) !== Number(order?.amount)) {
      await service
        .from('subscription_orders')
        .update({ status: 'amount_mismatch', updated_at: new Date().toISOString() })
        .eq('order_id', body.external_id)
      return NextResponse.json({ message: 'Jumlah tidak cocok' }, { status: 200 })
    }

    await service
      .from('subscription_orders')
      .update({
        status: 'paid',
        consumed_at: new Date().toISOString(),
        xendit_invoice_id: body.id ?? null,
        midtrans_payload: body,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', body.external_id)

    if (order?.store_id) {
      await service
        .from('stores')
        .update({ on_table_enabled: true, updated_at: new Date().toISOString() })
        .eq('id', order.store_id)
    }

    return NextResponse.json({ message: 'Add-on diaktifkan' }, { status: 200 })
  }

  const { data, error } = await service.rpc('consume_subscription_order', {
    p_order_id: body.external_id,
    p_gross_amount: Number(body.amount),
    p_xendit_invoice_id: body.id ?? null,
    p_payload: body,
    p_days: days,
  })

  if (error) {
    console.error('consume_subscription_order gagal', { orderId: body.external_id, code: error.code })
    return NextResponse.json({ error: 'Gagal memproses' }, { status: 500 })
  }

  const result = Array.isArray(data) ? data[0] : data

  if (result?.reason === 'order_not_found') {
    console.warn('Notifikasi Xendit untuk order yang tidak dikenal', { orderId: body.external_id })
    return NextResponse.json({ message: 'Order tidak dikenal' }, { status: 200 })
  }

  if (result?.reason === 'amount_mismatch') {
    console.error('Jumlah pembayaran tidak cocok dengan order', { orderId: body.external_id })
    return NextResponse.json({ message: 'Jumlah tidak cocok' }, { status: 200 })
  }

  return NextResponse.json(
    { message: result?.applied ? 'Langganan diperpanjang' : 'Sudah diproses sebelumnya' },
    { status: 200 }
  )
}