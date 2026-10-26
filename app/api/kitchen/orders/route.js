import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'

export async function GET(req) {
  const url = new URL(req.url)
  const storeId = url.searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId diperlukan' }, { status: 400 })
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('transactions')
    .select('id, amount, product_name, queue_number, table_number, created_at, status')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(50)
  return NextResponse.json(data || [])
}
