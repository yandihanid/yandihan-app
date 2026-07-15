import { createServiceClient } from '@/utils/supabase/service'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/pelanggan?storeId=xxx  — dipanggil dari dashboard (butuh auth)
export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId diperlukan' }, { status: 400 })

  // Pastikan store milik user
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('user_id', user.id)
    .single()

  if (!store) return NextResponse.json({ error: 'Toko tidak ditemukan' }, { status: 404 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('customers')
    .select('id, name, phone, visit_count, total_spent, created_at')
    .eq('store_id', storeId)
    .order('visit_count', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}

// POST /api/pelanggan  — dipanggil dari kasir weblink (pakai token, tanpa auth)
// Body: { token, name, phone }
export async function POST(req) {
  const body = await req.json()
  const { token, name, phone } = body

  if (!token || !name || !phone) {
    return NextResponse.json({ error: 'token, name, phone diperlukan' }, { status: 400 })
  }

  const trimmedName = name.trim()
  const cleanedPhone = phone.replace(/\D/g, '')
  let normalizedPhone = cleanedPhone
  if (normalizedPhone.startsWith('62')) {
    normalizedPhone = '0' + normalizedPhone.slice(2)
  } else if (normalizedPhone.length > 0 && !normalizedPhone.startsWith('0')) {
    normalizedPhone = '0' + normalizedPhone
  }

  if (!normalizedPhone) {
    return NextResponse.json({ error: 'Nomor WhatsApp tidak valid' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Cari cashier + store lewat token
  const { data: cashier } = await supabase
    .from('cashiers')
    .select('id, store_id, stores(id, subscription_tier, pelanggan_enabled, visit_threshold, discount_percent)')
    .eq('token', token)
    .single()

  if (!cashier) return NextResponse.json({ error: 'Token tidak valid' }, { status: 404 })

  const store = cashier.stores
  if (store.subscription_tier !== 'PRO') {
    return NextResponse.json({ error: 'Fitur pelanggan hanya untuk plan PRO' }, { status: 403 })
  }

  if (!store.pelanggan_enabled) {
    return NextResponse.json({ error: 'Fitur pelanggan belum diaktifkan' }, { status: 403 })
  }

  // Upsert customer: jika nomor WA sudah ada di toko ini, update kunjungan
  const { data: existing } = await supabase
    .from('customers')
    .select('id, visit_count, total_spent')
    .eq('store_id', cashier.store_id)
    .eq('phone', normalizedPhone)
    .single()

  let customer
  if (existing) {
    const { data, error } = await supabase
      .from('customers')
      .update({
        name: trimmedName, // update nama kalau berubah
        visit_count: existing.visit_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    customer = data
  } else {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        store_id: cashier.store_id,
        name: trimmedName,
        phone: normalizedPhone,
        visit_count: 1,
        total_spent: 0,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    customer = data
  }

  // Hitung apakah dapat diskon
  const threshold = store.visit_threshold ?? 5
  const discountPct = store.discount_percent ?? 10
  const getsDiscount = customer.visit_count >= threshold
  
  return NextResponse.json({
    success: true,
    customer,
    discount_percent: getsDiscount ? discountPct : 0,
    visit_threshold: threshold,
    message: getsDiscount
      ? `Selamat! Pelanggan mendapat diskon ${discountPct}% (${customer.visit_count} kunjungan)`
      : `Tersimpan. Butuh ${threshold - customer.visit_count} kunjungan lagi untuk diskon`,
  })
}