import { NextResponse } from 'next/server'
import { requireStoreOwnership } from '@/lib/dal'
import { isPro } from '@/lib/plan'
import { createClient } from '@/utils/supabase/server'

// PATCH /api/pelanggan/settings
// Body: { storeId, pelanggan_enabled?, visit_threshold?, discount_percent? }
//
// Perubahan: kepemilikan toko lewat lib/dal, gerbang PRO memakai isPro() yang
// ikut memeriksa subscription_end_date (dulu `subscription_tier !== 'PRO'`
// mentah, jadi langganan kedaluwarsa tetap lolos -- temuan C9), dan nilai
// numerik divalidasi rentangnya. Tanpa validasi itu discount_percent bisa
// diisi 500 atau NaN dan langsung masuk ke kolom yang dipakai menghitung uang.
export async function PATCH(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  const { storeId, pelanggan_enabled, visit_threshold, discount_percent } = body || {}
  if (!storeId) return NextResponse.json({ error: 'storeId diperlukan' }, { status: 400 })

  const { store, error: ownErr } = await requireStoreOwnership(storeId)
  if (ownErr) return NextResponse.json({ error: ownErr }, { status: 403 })

  if (!isPro(store)) {
    return NextResponse.json(
      { error: 'Program pelanggan setia hanya tersedia di paket PRO yang masih aktif.' },
      { status: 403 }
    )
  }

  const updates = {}
  if (typeof pelanggan_enabled === 'boolean') updates.pelanggan_enabled = pelanggan_enabled

  if (visit_threshold !== undefined) {
    const value = Number.parseInt(visit_threshold, 10)
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      return NextResponse.json(
        { error: 'Ambang kunjungan harus antara 1 dan 100.' },
        { status: 400 }
      )
    }
    updates.visit_threshold = value
  }

  if (discount_percent !== undefined) {
    const value = Number.parseInt(discount_percent, 10)
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return NextResponse.json({ error: 'Diskon harus antara 0 dan 100 persen.' }, { status: 400 })
    }
    updates.discount_percent = value
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Tidak ada field yang diubah' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .update(updates)
    .eq('id', store.id)
    .select('id, pelanggan_enabled, visit_threshold, discount_percent')
    .maybeSingle()

  if (error) {
    console.error('Gagal menyimpan setelan pelanggan', { code: error.code })
    return NextResponse.json({ error: 'Gagal menyimpan setelan' }, { status: 500 })
  }

  return NextResponse.json({ success: true, store: data })
}
