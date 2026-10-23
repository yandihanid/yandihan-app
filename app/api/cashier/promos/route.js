import { NextResponse } from 'next/server'
import { authorizeCashier, readCashierToken, tokenBucket } from '@/lib/cashierAuth'
import { createServiceClient } from '@/utils/supabase/service'
import { checkRateLimit, tooManyRequests } from '@/lib/rateLimit'

const NO_STORE = { 'cache-control': 'private, no-store' }

export async function GET(req) {
  const token = readCashierToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Token kasir diperlukan' }, { status: 400, headers: NO_STORE })
  }

  const rate = await checkRateLimit(tokenBucket('cashier:promos', token), {
    limit: 60,
    windowSeconds: 60,
  })
  if (!rate.allowed) return tooManyRequests(rate.retryAfter)

  const auth = await authorizeCashier(req, 'id, store_id, stores!inner(pelanggan_enabled)')
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE })
  }
  const { cashier, supabase } = auth

  const store = cashier.stores || {}
  if (!store.pelanggan_enabled) {
    return NextResponse.json({ error: 'Fitur pelanggan tidak aktif' }, { status: 403, headers: NO_STORE })
  }

  // Ambil promo aktif untuk toko ini
  const { data: promos, error } = await supabase
    .from('promos')
    .select('id, name, type, value, product_ids, usage_limit_per_phone, starts_at, ends_at, is_active')
    .eq('store_id', cashier.store_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Gagal memuat promo kasir', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Gagal memuat promo' }, { status: 500, headers: NO_STORE })
  }

  // Filter promo yang masih dalam periode valid
  const now = new Date()
  const validPromos = (promos || []).filter((p) => {
    if (p.starts_at && new Date(p.starts_at) > now) return false
    if (p.ends_at && new Date(p.ends_at) < now) return false
    return true
  })

  // Ambil nama produk untuk setiap promo
  const promoIds = validPromos.map((p) => p.id)
  const productIds = [...new Set(validPromos.flatMap((p) => p.product_ids || []))]

  let productMap = {}
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('store_id', cashier.store_id)
      .in('id', productIds)

    for (const prod of products || []) {
      productMap[prod.id] = prod
    }
  }

  const enrichedPromos = validPromos.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    value: Number(p.value),
    product_ids: p.product_ids,
    usage_limit_per_phone: p.usage_limit_per_phone,
    products: (p.product_ids || []).map((pid) => productMap[pid]).filter(Boolean),
  }))

  return NextResponse.json({ promos: enrichedPromos }, { headers: NO_STORE })
}