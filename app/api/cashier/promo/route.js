import { NextResponse } from 'next/server'
import { authorizeCashier, readCashierToken, tokenBucket } from '@/lib/cashierAuth'
import { createServiceClient } from '@/utils/supabase/service'
import { checkRateLimit, tooManyRequests } from '@/lib/rateLimit'
import { normalizePhone } from '@/lib/format'

const NO_STORE = { 'cache-control': 'private, no-store' }

export async function GET(req) {
  const token = readCashierToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Token kasir diperlukan' }, { status: 400, headers: NO_STORE })
  }

  const rate = await checkRateLimit(tokenBucket('cashier:promo', token), {
    limit: 60,
    windowSeconds: 60,
  })
  if (!rate.allowed) return tooManyRequests(rate.retryAfter)

  const phone = normalizePhone(new URL(req.url).searchParams.get('phone'))
  const promoId = new URL(req.url).searchParams.get('promoId')

  if (!phone) {
    return NextResponse.json({ error: 'Nomor tidak valid' }, { status: 400, headers: NO_STORE })
  }
  if (!promoId) {
    return NextResponse.json({ error: 'promoId diperlukan' }, { status: 400, headers: NO_STORE })
  }

  const auth = await authorizeCashier(req, 'id, store_id, stores!inner(pelanggan_enabled)')
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE })
  }
  const { cashier, supabase } = auth

  const store = cashier.stores || {}
  if (!store.pelanggan_enabled) {
    return NextResponse.json({ error: 'Fitur pelanggan tidak aktif' }, { status: 403, headers: NO_STORE })
  }

  // Ambil promo
  const { data: promo, error } = await supabase
    .from('promos')
    .select('id, name, type, value, product_ids, usage_limit_per_phone, starts_at, ends_at, is_active')
    .eq('id', promoId)
    .eq('store_id', cashier.store_id)
    .maybeSingle()

  if (error || !promo) {
    return NextResponse.json({ error: 'Promo tidak ditemukan' }, { status: 404, headers: NO_STORE })
  }

  if (!promo.is_active) {
    return NextResponse.json({ error: 'Promo tidak aktif' }, { status: 403, headers: NO_STORE })
  }

  // Cek periode
  if (promo.starts_at && new Date(promo.starts_at) > new Date()) {
    return NextResponse.json({ error: 'Promo belum dimulai' }, { status: 403, headers: NO_STORE })
  }
  if (promo.ends_at && new Date(promo.ends_at) < new Date()) {
    return NextResponse.json({ error: 'Promo sudah berakhir' }, { status: 403, headers: NO_STORE })
  }

  // Cek apakah produk di keranjang cocok dengan promo
  // Ini hanya validasi awal, validasi detail dilakukan saat submit
  const { data: promoProducts } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('store_id', cashier.store_id)
    .in('id', promo.product_ids)

  return NextResponse.json({
    promo: {
      id: promo.id,
      name: promo.name,
      type: promo.type,
      value: Number(promo.value),
      product_ids: promo.product_ids,
      usage_limit_per_phone: promo.usage_limit_per_phone,
      products: promoProducts || [],
    },
  }, { headers: NO_STORE })
}

export async function POST(req) {
  const token = readCashierToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Token kasir diperlukan' }, { status: 400, headers: NO_STORE })
  }

  const rate = await checkRateLimit(tokenBucket('cashier:promo:use', token), {
    limit: 30,
    windowSeconds: 60,
  })
  if (!rate.allowed) return tooManyRequests(rate.retryAfter)

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400, headers: NO_STORE })
  }

  const promoId = body?.promoId
  const phone = normalizePhone(body?.phone)

  if (!promoId) return NextResponse.json({ error: 'promoId diperlukan' }, { status: 400, headers: NO_STORE })
  if (!phone) return NextResponse.json({ error: 'Nomor telepon wajib diisi untuk menggunakan promo' }, { status: 400, headers: NO_STORE })

  const auth = await authorizeCashier(req, 'id, store_id, stores!inner(pelanggan_enabled)')
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE })
  }
  const { cashier } = auth

  const store = cashier.stores || {}
  if (!store.pelanggan_enabled) {
    return NextResponse.json({ error: 'Fitur pelanggan tidak aktif' }, { status: 403, headers: NO_STORE })
  }

  // Panggil RPC untuk cek dan catat penggunaan promo
  const service = createServiceClient()
  const { data, error } = await service.rpc('check_and_use_promo', {
    p_promo_id: promoId,
    p_store_id: cashier.store_id,
    p_phone: phone,
  })

  if (error) {
    console.error('check_and_use_promo error', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Gagal memvalidasi promo' }, { status: 500, headers: NO_STORE })
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result?.allowed) {
    return NextResponse.json({ error: result?.reason || 'Promo tidak dapat digunakan' }, { status: 403, headers: NO_STORE })
  }

  return NextResponse.json({
    success: true,
    currentUsage: result.current_usage,
    maxUsage: result.max_usage,
  }, { headers: NO_STORE })
}