import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createServiceClient } from '@/utils/supabase/service'
import { requireStoreOwnership } from '@/lib/dal'
import { PRO_PRICE_IDR } from '@/lib/plan'
import { snapApiUrl, midtransAuthHeader } from '@/lib/midtrans'
import { checkRateLimit, tooManyRequests, clientIp } from '@/lib/rateLimit'

export async function POST(req) {
  try {
    const { storeId } = await req.json()

    const { store, user, error: ownErr } = await requireStoreOwnership(storeId)
    if (ownErr) return NextResponse.json({ error: ownErr }, { status: 403 })

    const rate = await checkRateLimit(`payment:create:${user.id}`, { limit: 10, windowSeconds: 300 })
    if (!rate.allowed) return tooManyRequests(rate.retryAfter)

    // order_id tidak lagi `PRO-${Date.now()}`.
    // Timestamp milidetik mudah ditebak, dan order lama tidak terikat ke toko
    // mana pun sehingga webhook harus mempercayai metadata dari body request.
    // Sekarang: UUID acak, dan pemetaan order -> toko/user disimpan di DB.
    // Midtrans membatasi order_id 50 karakter; 'PRO-' + 32 hex = 36.
    const orderId = `PRO-${randomUUID().replace(/-/g, '')}`
    const grossAmount = PRO_PRICE_IDR

    const service = createServiceClient()

    // Catat order SEBELUM memanggil Midtrans. Kalau dicatat setelahnya dan
    // pencatatannya gagal, pembayaran yang sudah lunas tidak akan pernah bisa
    // dikaitkan ke toko mana pun.
    const { error: orderErr } = await service.from('subscription_orders').insert({
      order_id: orderId,
      store_id: store.id,
      user_id: user.id,
      amount: grossAmount,
      plan: 'PRO',
      status: 'pending',
    })

    if (orderErr) {
      return NextResponse.json({ error: 'Gagal membuat order. Coba lagi.' }, { status: 500 })
    }

    const midtransRes = await fetch(snapApiUrl(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: midtransAuthHeader(),
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: grossAmount,
        },
        item_details: [
          {
            id: 'PRO-1M',
            name: 'Yandihan Kasir PRO - 1 bulan',
            price: grossAmount,
            quantity: 1,
          },
        ],
        customer_details: {
          email: user.email,
        },
        // metadata tetap dikirim untuk memudahkan pelacakan di dashboard
        // Midtrans, TAPI tidak pernah dipercaya lagi oleh webhook. Sumber
        // kebenarannya tabel subscription_orders.
        metadata: {
          store_id: store.id,
        },
      }),
    })

    const midtransData = await midtransRes.json()

    if (!midtransRes.ok || !midtransData?.token) {
      await service
        .from('subscription_orders')
        .update({ status: 'gateway_error', updated_at: new Date().toISOString() })
        .eq('order_id', orderId)

      // Detail error gateway hanya untuk log server, bukan untuk client.
      console.error('Midtrans Snap error', {
        orderId,
        status: midtransRes.status,
        code: midtransData?.status_code,
      })
      return NextResponse.json(
        { error: 'Gagal menghubungi gateway pembayaran. Coba lagi.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ token: midtransData.token, orderId })
  } catch (error) {
    console.error('Payment create error', { ip: clientIp(req), message: error?.message })
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}
