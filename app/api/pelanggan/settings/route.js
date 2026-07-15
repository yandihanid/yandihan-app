import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/pelanggan/settings
// Body: { storeId, pelanggan_enabled?, visit_threshold?, discount_percent? }
export async function PATCH(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { storeId, pelanggan_enabled, visit_threshold, discount_percent } = body

  if (!storeId) return NextResponse.json({ error: 'storeId diperlukan' }, { status: 400 })

  // Pastikan store milik user dan plan PRO
  const { data: store } = await supabase
    .from('stores')
    .select('id, subscription_tier')
    .eq('id', storeId)
    .eq('user_id', user.id)
    .single()

  if (!store) return NextResponse.json({ error: 'Toko tidak ditemukan' }, { status: 404 })

  if (store.subscription_tier !== 'PRO') {
    return NextResponse.json({ error: 'Fitur pelanggan hanya untuk plan PRO' }, { status: 403 })
  }

  // Build update object — hanya field yang dikirim
  const updates = {}
  if (typeof pelanggan_enabled === 'boolean') updates.pelanggan_enabled = pelanggan_enabled
  if (visit_threshold !== undefined) updates.visit_threshold = Number(visit_threshold)
  if (discount_percent !== undefined) updates.discount_percent = Number(discount_percent)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Tidak ada field yang diupdate' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('stores')
    .update(updates)
    .eq('id', storeId)
    .select('id, pelanggan_enabled, visit_threshold, discount_percent')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, store: data })
}