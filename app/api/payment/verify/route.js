import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { requireUser } from '@/lib/dal'
import { checkRateLimit, tooManyRequests } from '@/lib/rateLimit'

/**
 * Jalur cadangan kalau webhook Xendit belum datang (mis. localhost, atau
 * notifikasi tertunda): client memanggil ini setelah pembayaran selesai.
 * Perbedaan versi sebelumnya:
 *   * `storeId` tidak lagi diambil dari body. Toko diturunkan dari
 *     subscription_orders, dan order itu harus milik user yang sedang login.
 *   * Perpanjangan lewat RPC yang sama dengan webhook, jadi memanggil endpoint
 *     ini berulang kali tidak bisa menambah masa aktif berkali-kali (replay).
 *   * Tidak ada pemanggian ke status API eksternal (Midtrans/Xendit);
 *     kita hanya membaca dari database dan memproses konsumsi langganan.
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
      .select('order_id, store_id, amount, plan, consumed_at')
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

    // Proses konsumsi langganan langsung melalui RPC (sama seperti webhook Xendit).
    // Ini idempoten: jika order sudah dikonsumsi, RPC akan merespons dengan
    // reason 'already_consumed' dan kita hanya akan mengembalikan paid: true.
    const { data, error } = await service.rpc('consume_subscription_order', {
      p_order_id: orderId,
      p_gross_amount: Number(order.amount),
      p_xendit_invoice_id: order.xendit_invoice_id ?? null,
      p_payload: { order_id: orderId, stored: true },
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

    if (result?.applied) {
      // Langganan berhasil diperpanjang, baca tanggal berakhir baru
      const { data: store } = await service
        .from('stores')
        .select('subscription_end_date')
        .eq('id', order.store_id)
        .maybeSingle()
      return NextResponse.json({ paid: true, expiresAt: store?.subscription_end_date ?? null })
    }

    // Sudah pernah diproses sebelumnya (replay)
    return NextResponse.json({ paid: true, expiresAt: order.subscription_end_date ?? null })
  } catch (error) {
    console.error('Verify error', { message: error?.message })
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}