import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { requireUser } from '@/lib/dal'
import { checkRateLimit, tooManyRequests } from '@/lib/rateLimit'
import { getXenditInvoice } from '@/lib/xendit'
import { applyPaidInvoice } from '@/lib/subscriptionOrders'

/**
 * Jalur cadangan kalau webhook Xendit belum datang (mis. localhost, URL webhook
 * salah pasang, atau notifikasi tertunda): client memanggil ini setelah
 * pembayaran selesai.
 *
 * Status dan nominal dibaca dari Xendit, bukan dari body request, sehingga
 * endpoint ini tidak bisa dipakai mengaktifkan PRO tanpa membayar.
 *
 * Logika penerapannya sama dengan webhook (lib/subscriptionOrders.js), jadi
 * kedua jalur tidak bisa berbeda perilaku.
 */

export async function POST(req) {
  try {
    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId wajib diisi' }, { status: 400 })

    const { user, error: authErr } = await requireUser()
    if (authErr) return NextResponse.json({ error: authErr }, { status: 401 })

    const rate = await checkRateLimit(`payment:verify:${user.id}`, { limit: 30, windowSeconds: 300 })
    if (!rate.allowed) return tooManyRequests(rate.retryAfter)

    const service = createServiceClient()
    const { data: order } = await service
      .from('subscription_orders')
      .select('order_id, store_id, amount, plan, consumed_at, xendit_invoice_id')
      .eq('order_id', orderId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!order) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })

    if (order.consumed_at) {
      const { data: store } = await service
        .from('stores')
        .select('subscription_end_date')
        .eq('id', order.store_id)
        .maybeSingle()
      return NextResponse.json({ paid: true, expiresAt: store?.subscription_end_date ?? null })
    }

    if (!order.xendit_invoice_id) {
      return NextResponse.json(
        { paid: false, error: 'Invoice Xendit untuk order ini belum tercatat.' },
        { status: 409 }
      )
    }

    // Satu-satunya sumber kebenaran soal "sudah dibayar" adalah Xendit.
    const invoice = await getXenditInvoice(order.xendit_invoice_id)

    if (!invoice) {
      return NextResponse.json(
        { paid: false, error: 'Gagal memeriksa status pembayaran ke Xendit. Coba lagi.' },
        { status: 502 }
      )
    }

    if (invoice.external_id && invoice.external_id !== order.order_id) {
      return NextResponse.json(
        { paid: false, error: 'Invoice tidak cocok dengan order.' },
        { status: 409 }
      )
    }

    if (invoice.status !== 'PAID' && invoice.status !== 'SETTLED') {
      return NextResponse.json({ paid: false, status: invoice.status ?? 'PENDING' })
    }

    const result = await applyPaidInvoice(service, order, invoice)

    if (result.reason === 'amount_mismatch') {
      return NextResponse.json(
        { paid: false, error: 'Jumlah pembayaran tidak cocok dengan order.' },
        { status: 409 }
      )
    }

    if (result.reason === 'rpc_error' || result.reason === 'db_error') {
      return NextResponse.json({ error: 'Gagal memperbarui langganan' }, { status: 500 })
    }

    // applied maupun already_consumed sama-sama berarti sudah lunas.
    let expiresAt = result.expiresAt ?? null

    if (!expiresAt) {
      const { data: store } = await service
        .from('stores')
        .select('subscription_end_date')
        .eq('id', order.store_id)
        .maybeSingle()
      expiresAt = store?.subscription_end_date ?? null
    }

    return NextResponse.json({ paid: true, expiresAt })
  } catch (error) {
    console.error('Verify error', { message: error?.message })
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}
