import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireStoreOwnership, requireUser } from '@/lib/dal'
import { checkRateLimit, tooManyRequests, clientIp } from '@/lib/rateLimit'

const NO_STORE = { 'cache-control': 'private, no-store' }

export async function GET(req, { params }) {
  const { user, error: authErr } = await requireUser()
  if (authErr) return NextResponse.json({ error: authErr }, { status: 401, headers: NO_STORE })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID promo tidak valid' }, { status: 400, headers: NO_STORE })

  const supabase = await createClient()
  const { data: promo } = await supabase
    .from('promos')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!promo) return NextResponse.json({ error: 'Promo tidak ditemukan' }, { status: 404, headers: NO_STORE })

  // Cek kepemilikan
  const { store, error: ownErr } = await requireStoreOwnership(promo.store_id)
  if (ownErr) return NextResponse.json({ error: ownErr }, { status: 403, headers: NO_STORE })

  return NextResponse.json({ promo }, { headers: NO_STORE })
}

export async function PATCH(req, { params }) {
  const { user, error: authErr } = await requireUser()
  if (authErr) return NextResponse.json({ error: authErr }, { status: 401, headers: NO_STORE })

  const ip = clientIp(req)
  const rate = await checkRateLimit(`promo:update:${user.id}`, { limit: 30, windowSeconds: 300 })
  if (!rate.allowed) return tooManyRequests(rate.retryAfter)

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID promo tidak valid' }, { status: 400, headers: NO_STORE })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400, headers: NO_STORE })
  }

  const supabase = await createClient()
  const { data: existingPromo } = await supabase
    .from('promos')
    .select('store_id')
    .eq('id', id)
    .maybeSingle()

  if (!existingPromo) return NextResponse.json({ error: 'Promo tidak ditemukan' }, { status: 404, headers: NO_STORE })

  const { store, error: ownErr } = await requireStoreOwnership(existingPromo.store_id)
  if (ownErr) return NextResponse.json({ error: ownErr }, { status: 403, headers: NO_STORE })

  const { name, description, type, value, product_ids, usage_limit_per_phone, starts_at, ends_at, is_active } = body

  const updates = {}
  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: 'Nama promo tidak boleh kosong' }, { status: 400, headers: NO_STORE })
    updates.name = name.trim()
  }
  if (description !== undefined) updates.description = description?.trim() || null
  if (type !== undefined) {
    if (!['fixed_price', 'percent_discount'].includes(type)) {
      return NextResponse.json({ error: 'Tipe promo tidak valid' }, { status: 400, headers: NO_STORE })
    }
    updates.type = type
  }
  if (value !== undefined) {
    if (value == null || Number(value) < 0) return NextResponse.json({ error: 'Nilai promo tidak valid' }, { status: 400, headers: NO_STORE })
    if (type === 'percent_discount' && Number(value) > 100) {
      return NextResponse.json({ error: 'Diskon persentase maksimal 100%' }, { status: 400, headers: NO_STORE })
    }
    updates.value = Number(value)
  }
  if (product_ids !== undefined) {
    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: 'Minimal 1 produk harus dipilih untuk promo' }, { status: 400, headers: NO_STORE })
    }
    // Validasi produk milik toko
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id')
      .eq('store_id', store.id)
      .in('id', product_ids)

    if (prodErr || !products || products.length !== product_ids.length) {
      return NextResponse.json({ error: 'Beberapa produk tidak valid atau bukan milik toko ini' }, { status: 400, headers: NO_STORE })
    }
    updates.product_ids = product_ids
  }
  if (usage_limit_per_phone !== undefined) {
    updates.usage_limit_per_phone = usage_limit_per_phone ? Number(usage_limit_per_phone) : null
  }
  if (starts_at !== undefined) updates.starts_at = starts_at || null
  if (ends_at !== undefined) updates.ends_at = ends_at || null
  if (is_active !== undefined) updates.is_active = Boolean(is_active)

  updates.updated_at = new Date().toISOString()

  const { data: promo, error } = await supabase
    .from('promos')
    .update(updates)
    .eq('id', id)
    .eq('store_id', store.id)
    .select()
    .maybeSingle()

  if (error) {
    console.error('Gagal update promo', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Gagal mengupdate promo' }, { status: 500, headers: NO_STORE })
  }

  if (!promo) return NextResponse.json({ error: 'Promo tidak ditemukan' }, { status: 404, headers: NO_STORE })

  return NextResponse.json({ promo }, { headers: NO_STORE })
}

export async function DELETE(req, { params }) {
  const { user, error: authErr } = await requireUser()
  if (authErr) return NextResponse.json({ error: authErr }, { status: 401, headers: NO_STORE })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID promo tidak valid' }, { status: 400, headers: NO_STORE })

  const supabase = await createClient()
  const { data: existingPromo } = await supabase
    .from('promos')
    .select('store_id')
    .eq('id', id)
    .maybeSingle()

  if (!existingPromo) return NextResponse.json({ error: 'Promo tidak ditemukan' }, { status: 404, headers: NO_STORE })

  const { store, error: ownErr } = await requireStoreOwnership(existingPromo.store_id)
  if (ownErr) return NextResponse.json({ error: ownErr }, { status: 403, headers: NO_STORE })

  const { error } = await supabase
    .from('promos')
    .delete()
    .eq('id', id)
    .eq('store_id', store.id)

  if (error) {
    console.error('Gagal hapus promo', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Gagal menghapus promo' }, { status: 500, headers: NO_STORE })
  }

  return NextResponse.json({ success: true }, { headers: NO_STORE })
}