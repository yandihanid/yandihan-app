import { NextResponse } from 'next/server'
import { requireUser, getMyStore } from '@/lib/dal'
import { planTier } from '@/lib/plan'

// Dipakai halaman /dashboard/pelanggan untuk tahu setelan loyalitas toko.
//
// Dua perbaikan: lookup toko lewat getMyStore() yang memakai maybeSingle()
// (dulu .single() -- pemilik dengan >1 toko kena PGRST116, temuan C11), dan
// `plan` mengikuti planTier() sehingga PRO yang masa aktifnya sudah lewat
// dilaporkan sebagai 'free' (temuan C9).
export async function GET() {
  const { error } = await requireUser()
  if (error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const store = await getMyStore()
  if (!store) return NextResponse.json({ error: 'Toko tidak ditemukan' }, { status: 404 })

  return NextResponse.json({
    id: store.id,
    name: store.name,
    plan: planTier(store).toLowerCase(),
    pelanggan_enabled: store.pelanggan_enabled ?? false,
    visit_threshold: store.visit_threshold ?? 5,
    discount_percent: store.discount_percent ?? 10,
  })
}
