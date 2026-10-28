import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { verifyXenditCallbackToken, isXenditPaidStatus } from '@/lib/xendit'
import { applyPaidInvoice } from '@/lib/subscriptionOrders'
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
    // Dicatat supaya 401 berulang di log langsung menunjuk ke token yang beda
    // antara Dashboard Xendit dan environment.
    console.warn('Callback Xendit ditolak: token tidak cocok', {
      orderId: body?.external_id,
      hasToken: Boolean(callbackToken),
    })
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
    .select('order_id, plan, amount, store_id, consumed_at, xendit_invoice_id')
    .eq('order_id', body.external_id)
    .maybeSingle()

  if (!order) {
    // Bisa jadi notifikasi dari project lain yang memakai akun Xendit sama.
    // Balas 200 supaya tidak dikirim ulang selamanya.
    console.warn('Notifikasi Xendit untuk order yang tidak dikenal', { orderId: body.external_id })
    return NextResponse.json({ message: 'Order tidak dikenal' }, { status: 200 })
  }

  const result = await applyPaidInvoice(service, order, body)

  if (result.reason === 'amount_mismatch') {
    await service
      .from('subscription_orders')
      .update({ status: 'amount_mismatch', updated_at: new Date().toISOString() })
      .eq('order_id', order.order_id)

    console.error('Jumlah pembayaran tidak cocok dengan order', {
      orderId: order.order_id,
      paid: body.amount,
      expected: order.amount,
    })
    return NextResponse.json({ message: 'Jumlah tidak cocok' }, { status: 200 })
  }

  if (result.reason === 'rpc_error' || result.reason === 'db_error') {
    // 500 disengaja: Xendit akan mencoba lagi, dan itu yang kita mau kalau
    // kegagalannya di sisi kita. Semua jalur di atas idempoten.
    return NextResponse.json({ error: 'Gagal memproses' }, { status: 500 })
  }

  return NextResponse.json(
    {
      message: result.applied
        ? result.addon
          ? 'Add-on diaktifkan'
          : 'Langganan diperpanjang'
        : 'Sudah diproses sebelumnya',
    },
    { status: 200 }
  )
}
