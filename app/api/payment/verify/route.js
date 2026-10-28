import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { requireUser } from '@/lib/dal'
import { checkRateLimit, tooManyRequests } from '@/lib/rateLimit'
import { getXenditInvoice, isXenditPaidStatus } from '@/lib/xendit'

/**
 * Jalur cadangan kalau webhook Xendit belum datang (mis. localhost, atau
 * notifikasi tertunda): client memanggil ini setelah pembayaran selesai.
 *
 * Versi sebelumnya langsung memakai `order.amount` dari database sebagai
 * "jumlah yang dibayar", sehingga endpoint ini bisa mengaktifkan PRO tanpa
 * pembayaran sama sekali. Sekarang status dan nominal dibaca dari Xendit dulu.
 *
 * Perpanjangan tetap lewat RPC yang sama dengan webhook, jadi memanggil
 * endpoint ini berulang kali tidak bisa menambah masa aktif berkali-kali.
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

    if (invoice.external_id !== order.order_id) {
      return NextResponse.json(
        { paid: false, error: 'Invoice tidak cocok dengan order.' },
        { status: 409 }
      )
    }

    if (!isXenditPaidStatus(invoice)) {
      return NextResponse.json({ paid: false, status: invoice.status ?? 'PENDING' })
    }

    if (Number(invoice.amount) !== Number(order.amount)) {
      return NextResponse.json(
        { paid: false, error: 'Jumlah pembayaran tidak cocok dengan order.' },
        { status: 409 }
      )
    }

    const isOnTableAddon =
      /on.?table|addon/i.test(String(order.plan || '')) || Number(order.amount) === 50000

    if (isOnTableAddon) {
      // Add-on tidak mengubah masa langganan; cukup tandai lunas dan aktifkan fitur.
      await service
        .from('subscription_orders')
        .update({
          status: 'paid',
          consumed_at: new Date().toISOString(),
          xendit_invoice_id: invoice.id ?? order.xendit_invoice_id,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', order.order_id)

      await service
        .from('stores')
        .update({ on_table_enabled: true, updated_at: new Date().toISOString() })
        .eq('id', order.store_id)

      return NextResponse.json({ paid: true, expiresAt: null })
    }

    const { data, error } = await service.rpc('consume_subscription_order', {
      p_order_id: order.order_id,
      p_gross_amount: Number(invoice.amount),
      p_xendit_invoice_id: invoice.id ?? order.xendit_invoice_id,
      p_payload: invoice,
      p_days: order.plan === 'PRO_ANNUAL' || Number(order.amount) >= 700000 ? 365 : 30,
    })

    if (error) {
      console.error('consume_subscription_order gagal (verify)', { orderId, code: error.code })
      return NextResponse.json({ error: 'Gagal memperbarui langganan' }, { status: 500 })
    }

    const result = Array.isArray(data) ? data[0] : data

    if (result?.reason === 'order_not_found') {
      return NextResponse.json({ paid: false, error: 'Order tidak ditemukan di database' }, { status: 404 })
    }

    if (result?.reason === 'amount_mismatch') {
      return NextResponse.json({ paid: false, error: 'Jumlah pembayaran tidak cocok dengan order.' }, { status: 409 })
    }

    // applied maupun already_consumed sama-sama berarti sudah lunas.
    const expiresAt = result?.subscription_end_date ?? null
    return NextResponse.json({ paid: true, expiresAt })
  } catch (error) {
    console.error('Verify error', { message: error?.message })
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}
