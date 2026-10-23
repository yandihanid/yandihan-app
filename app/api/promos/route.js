import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireStoreOwnership, requireUser } from '@/lib/dal'
import { checkRateLimit, tooManyRequests, clientIp } from '@/lib/rateLimit'

const NO_STORE = { 'cache-control': 'private, no-store' }

export async function GET(req) {
  const { user, error: authErr } = await requireUser()
  if (authErr) return NextResponse.json({ error: authErr }, { status: 401, headers: NO_STORE })

  const url = new URL(req.url)
  const storeId = url.searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId diperlukan' }, { status: 400, headers: NO_STORE })

  const { store, error: ownErr } = await requireStoreOwnership(storeId)
  if (ownErr) return NextResponse.json({ error: ownErr }, { status: 403, headers: NO_STORE })

  const supabase = await createClient()
  const { data: promos, error } = await supabase
    .from('promos')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Gagal memuat promo' }, { status: 500, headers: NO_STORE })

  return NextResponse.json({ promos: promos || [] }, { headers: NO_STORE })
}

export async function POST(req) {
  const { user, error: authErr } = await requireUser()
  if (authErr) return NextResponse.json({ error: authErr }, { status: 401, headers: NO_STORE })

  const ip = clientIp(req)
  const rate = await checkRateLimit(`promo:create:${user.id}`, { limit: 20, windowSeconds: 300 })
  if (!rate.allowed) return tooManyRequests(rate.retryAfter)

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400, headers: NO_STORE })
  }

  const { storeId, name, description, type, value, product_ids, usage_limit_per_phone, starts_at, ends_at } = body

  if (!storeId) return NextResponse.json({ error: 'storeId diperlukan' }, { status: 400, headers: NO_STORE })
  if (!name || !name.trim()) return NextResponse.json({ error: 'Nama promo wajib diisi' }, { status: 400, headers: NO_STORE })
  if (!type || !['fixed_price', 'percent_discount'].includes(type)) {
    return NextResponse.json({ error: 'Tipe promo tidak valid (fixed_price atau percent_discount)' }, { status: 400, headers: NO_STORE })
  }
  if (value == null || Number(value) < 0) return NextResponse.json({ error: 'Nilai promo tidak valid' }, { status: 400, headers: NO_STORE })
  if (type === 'percent_discount' && Number(value) > 100) {
    return NextResponse.json({ error: 'Diskon persentase maksimal 100%' }, { status: 400, headers: NO_STORE })
  }
  if (!Array.isArray(product_ids) || product_ids.length === 0) {
    return NextResponse.json({ error: 'Minimal 1 produk harus dipilih untuk promo' }, { status: 400, headers: NO_STORE })
  }

  const { store, error: ownErr } = await requireStoreOwnership(storeId)
  if (ownErr) return NextResponse.json({ error: ownErr }, { status: 403, headers: NO_STORE })

  const supabase = await createClient()

  // Validasi produk milik toko
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id')
    .eq('store_id', storeId)
    .in('id', product_ids)

  if (prodErr || !products || products.length !== product_ids.length) {
    return NextResponse.json({ error: 'Beberapa produk tidak valid atau bukan milik toko ini' }, { status: 400, headers: NO_STORE })
  }

  const { data: promo, error } = await supabase
    .from('promos')
    .insert({
      store_id: storeId,
      name: name.trim(),
      description: description?.trim() || null,
      type,
      value: Number(value),
      product_ids,
      usage_limit_per_phone: usage_limit_per_phone ? Number(usage_limit_per_phone) : null,
      starts_at: starts_at || null,
      ends_at: ends_at || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Gagal membuat promo', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Gagal membuat promo' }, { status: 500, headers: NO_STORE })
  }

  return NextResponse.json({ promo }, { headers: NO_STORE })
}