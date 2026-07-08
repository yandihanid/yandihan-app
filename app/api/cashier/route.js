import { createServiceClient } from '@/utils/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const deviceId = searchParams.get('deviceId') // Added deviceId

  if (!token) {
    return NextResponse.json({ error: 'Token diperlukan' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: cashier, error } = await supabase
    .from('cashiers')
    .select('id, name, store_id, device_id, stores(name, subscription_tier, receipt_required)')
    .eq('token', token)
    .single()

  if (error || !cashier) {
    return NextResponse.json({ error: 'Kasir tidak ditemukan' }, { status: 404 })
  }

  // Device Binding Logic
  if (deviceId) {
    if (!cashier.device_id) {
      // First time use, bind the device
      await supabase.from('cashiers').update({ device_id: deviceId }).eq('id', cashier.id)
    } else if (cashier.device_id !== deviceId) {
      // Device mismatch
      return NextResponse.json({ error: 'Link kasir ini sudah digunakan di perangkat lain. (Device Binding Aktif)' }, { status: 403 })
    }
  }

  // Fetch products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock')
    .eq('store_id', cashier.store_id)
    .order('name', { ascending: true })

  return NextResponse.json({ ...cashier, products: products || [] })
}
