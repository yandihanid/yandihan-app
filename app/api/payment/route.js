import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createServiceClient } from '@/utils/supabase/service'
import { requireStoreOwnership } from '@/lib/dal'
import { PRO_PRICE_IDR, PRO_ANNUAL_PRICE_IDR } from '@/lib/plan'
import { createXenditInvoice, isXenditProduction } from '@/lib/xendit'
import { checkRateLimit, tooManyRequests, clientIp } from '@/lib/rateLimit'

export async function POST(req) {
  try {
    const { storeId, planType = 'monthly' } = await req.json()

    const { store, user, error: ownErr } = await requireStoreOwnership(storeId)
    if (ownErr) return NextResponse.json({ error: ownErr }, { status: 403 })

    const rate = await checkRateLimit(`payment:create:${user.id}`, { limit: 10, windowSeconds: 300 })
    if (!rate.allowed) return tooManyRequests(rate.retryAfter)

    const isAnnual = planType === 'annual'
    const grossAmount = isAnnual ? PRO_ANNUAL_PRICE_IDR : PRO_PRICE_IDR
    const planDurationDays = isAnnual ? 365 : 30
    const planItemName = isAnnual
      ? 'Yandihan Kasir PRO - 1 tahun (Tahunan)'
      : 'Yandihan Kasir PRO - 1 bulan'
    const planItemId = isAnnual ? 'PRO-1Y' : 'PRO-1M'

    // order_id dengan prefix PRO- + UUID tanpa dash
    const orderId = `PRO-${randomUUID().replace(/-/g, '')}`

    const service = createServiceClient()

    // Catat order SEBELUM memanggil Xendit
    const { error: orderErr } = await service.from('subscription_orders').insert({
      order_id: orderId,
      store_id: store.id,
      user_id: user.id,
      amount: grossAmount,
      plan: isAnnual ? 'PRO_ANNUAL' : 'PRO',
      status: 'pending',
    })

    if (orderErr) {
      return NextResponse.json({ error: 'Gagal membuat order. Coba lagi.' }, { status: 500 })
    }

    // Buat invoice Xendit
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const xenditRes = await createXenditInvoice({
      externalId: orderId,
      amount: grossAmount,
      description: planItemName,
      customerEmail: user.email,
      customerName: store.name,
      items: [
        {
          name: planItemName,
          quantity: 1,
          price: grossAmount,
          category: 'Software',
        },
      ],
      successRedirectUrl: `${baseUrl}/dashboard/billing?payment=success`,
      failureRedirectUrl: `${baseUrl}/dashboard/billing?payment=failed`,
      callbackUrl: `${baseUrl}/api/payment/xendit/callback`,
    })

    const xenditData = await xenditRes.json()

    // Tangkap error kode Xendit untuk logging dan pesan yang lebih informatif
    const xenditErrorCode = xenditData?.code
    const xenditErrorMessage = xenditData?.message

    if (!xenditRes.ok || !xenditData?.id) {
      // Update order status ke gateway_error beserta code Xendit
      await service
        .from('subscription_orders')
        .update({ status: 'gateway_error', xendit_error_code: xenditErrorCode, xendit_error_message: xenditErrorMessage, updated_at: new Date().toISOString() })
        .eq('order_id', orderId)

      // Maping error code Xendit ke pesan pengguna (opsional: bisa diperluas)
      let userMessage = 'Gagal menghubungi gateway pembayaran. Coba lagi.'
      if (xenditErrorCode) {
        console.error('Xendit Invoice error', {
          orderId,
          status: xenditRes.status,
          code: xenditErrorCode,
          message: xenditErrorMessage,
        })
        // Contoh: code 400 = bad request, code 401 = unauthorized, dll
        userMessage = 'Gagal membuat invoice di gateway. Kode error: ' + xenditErrorCode + '. Hubungi pengelola jika masalah berlanjut.'
      }

      return NextResponse.json(
        { error: userMessage },
        { status: 502 }
      )
    }

    // Simpan invoice_id Xendit ke order untuk referensi
    await service
      .from('subscription_orders')
      .update({ xendit_invoice_id: xenditData.id, updated_at: new Date().toISOString() })
      .eq('order_id', orderId)

    return NextResponse.json({
      invoiceUrl: xenditData.invoice_url,
      invoiceId: xenditData.id,
      orderId,
    })
  } catch (error) {
    console.error('Payment create error', { ip: clientIp(req), message: error?.message })
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}