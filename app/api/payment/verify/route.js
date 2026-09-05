import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { requireUser } from '@/lib/dal'
import { statusApiUrl, midtransAuthHeader, isPaidStatus } from '@/lib/midtrans'
import { checkRateLimit, tooManyRequests } from '@/lib/rateLimit'

// Jalur cadangan kalau webhook Midtrans belum masuk (mis. localhost, atau
// notifikasi tertunda): client memanggil ini setelah Snap ditutup.
//
// Perbedaan penting dari versi sebelumnya:
//   * `storeId` tidak lagi diambil dari body. Toko diturunkan dari
//     subscription_orders, dan order itu harus milik user yang sedang login.
//   * perpanjangan lewat RPC yang sama dengan webhook, jadi memanggil endpoint
//     ini berulang kali tidak bisa menambah masa aktif berkali-kali (replay).
//   * console.log yang mencetak store ID dan masa berlaku ke log produksi
//     dihapus.

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
      .select('order_id, store_id, amount, consumed_at')
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

    const statusRes = await fetch(statusApiUrl(orderId), {
      headers: { Accept: 'application/json', Authorization: midtransAuthHeader() },
    })
    const statusData = await statusRes.json()

    if (!isPaidStatus(statusData)) {
      return NextResponse.json({ paid: false, status: statusData.transaction_status ?? 'unknown' })
    }

    const { data, error } = await service.rpc('consume_subscription_order', {
      p_order_id: orderId,
      p_gross_amount: Number(statusData.gross_amount),
      p_midtrans_transaction_id: statusData.transaction_id ?? null,
      p_payload: statusData,
      p_days: 30,
    })

    if (error) {
      console.error('consume_subscription_order gagal (verify)', { orderId, code: error.code })
      return NextResponse.json({ error: 'Gagal memperbarui langganan' }, { status: 500 })
    }

    const result = Array.isArray(data) ? data[0] : data

    if (result?.reason === 'amount_mismatch') {
      return NextResponse.json(
        { paid: false, error: 'Jumlah pembayaran tidak cocok dengan order.' },
        { status: 409 }
      )
    }

    return NextResponse.json({ paid: true, expiresAt: result?.subscription_end_date ?? null })
  } catch (error) {
    console.error('Verify error', { message: error?.message })
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}
