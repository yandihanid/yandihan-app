import { createServiceClient } from '@/utils/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token diperlukan' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: cashier, error } = await supabase
    .from('cashiers')
    .select('id, name, store_id, stores(name)')
    .eq('token', token)
    .single()

  if (error || !cashier) {
    return NextResponse.json({ error: 'Kasir tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json(cashier)
}
