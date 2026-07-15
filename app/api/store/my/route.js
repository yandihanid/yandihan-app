import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: store, error } = await supabase
    .from('stores')
    .select('id, name, subscription_tier, pelanggan_enabled, visit_threshold, discount_percent')
    .eq('user_id', user.id)
    .single()

  if (error || !store) {
    return NextResponse.json({ error: 'Toko tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({
    id: store.id,
    name: store.name,
    plan: store.subscription_tier === 'PRO' ? 'pro' : 'free',
    pelanggan_enabled: store.pelanggan_enabled ?? false,
    visit_threshold: store.visit_threshold ?? 5,
    discount_percent: store.discount_percent ?? 10,
  })
}