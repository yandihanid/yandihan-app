import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { getXenditInvoice, isXenditPaidStatus } from '@/lib/xendit'
import { settleTableOrder } from '@/lib/tableOrderFlow'
import { checkRateLimit, tooManyRequests, clientIp } from '@/lib/rateLimit'

const NO_STORE = { 'cache-control': 'private, no-store' }

const ORDER_FIELDS = `
  id,
  store_id,
  table_number,
  items,
  subtotal,
  service_fee,
  amount,
  status,
  queue_number,
  xendit_invoice_id,
  invoice_url,
  xendit_for_user_id,
  transaction_id,
  failure_reason,
  paid_at,
  created_at,
  stores(name)
`

/**
 * Status pesanan meja untuk halaman pelanggan.
 *
 * Selain membaca database, endpoint ini juga merekonsiliasi sendiri ke Xendit
 * kalau pesanan masih pending. Jadi nomor antrean tetap muncul walau webhook
 * belum/tidak terkirim -- dan stok baru berkurang saat benar-benar lunas.
 */
export async function GET(req, { params }) {
  const ip = clientIp(req)
  const rate = await checkRateLimit(`table-order:status:${ip}`, { limit: 120, windowSeconds: 60 })
  if (!rate.allowed) return tooManyRequests(rate.retryAfter)

  const { orderId } = await params
  if (!orderId) {
    return NextResponse.json({ error: 'orderId diperlukan' }, { status: 400, headers: NO_STORE })
  }

  const supabase = createServiceClient()

  let { data: order } = await supabase
    .from('table_orders')
    .select(ORDER_FIELDS)
    .eq('id', orderId)
    .maybeSingle()

  if (!order) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404, headers: NO_STORE })
  }

  if (order.status === 'pending' && order.xendit_invoice_id) {
    // Invoice sub-account hanya bisa dibaca dengan header for-user-id yang sama
    // seperti saat dibuat, jadi nilai yang tersimpan di pesanan dipakai lagi.
    const invoice = await getXenditInvoice(order.xendit_invoice_id, {
      forUserId: order.xendit_for_user_id ?? null,
    })

    if (invoice && isXenditPaidStatus(invoice)) {
      const result = await settleTableOrder(supabase, order, invoice)

      if (result.status !== order.status) {
        const { data: fresh } = await supabase
          .from('table_orders')
          .select(ORDER_FIELDS)
          .eq('id', orderId)
          .maybeSingle()
        order = fresh || order
      }
    } else if (invoice && invoice.status === 'EXPIRED') {
      await supabase
        .from('table_orders')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('status', 'pending')
      order = { ...order, status: 'expired' }
    }
  }

  return NextResponse.json(
    {
      orderId: order.id,
      storeName: order.stores?.name ?? null,
      tableNumber: order.table_number,
      items: Array.isArray(order.items) ? order.items : [],
      subtotal: Number(order.subtotal ?? 0),
      serviceFee: Number(order.service_fee ?? 0),
      amount: Number(order.amount ?? 0),
      status: order.status,
      queueNumber: order.queue_number ?? null,
      paidAt: order.paid_at ?? null,
      createdAt: order.created_at,
      failureReason: order.failure_reason ?? null,
      invoiceId: order.xendit_invoice_id ?? null,
      invoiceUrl: order.invoice_url ?? null,
    },
    { headers: NO_STORE }
  )
}
