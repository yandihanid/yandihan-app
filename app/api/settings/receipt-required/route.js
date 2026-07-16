import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { storeId, receiptRequired } = await req.json()
  if (!storeId || typeof receiptRequired !== 'boolean') {
    return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
  }

  const { error } = await supabase
    .from('stores')
    .update({ receipt_required: receiptRequired })
    .eq('id', storeId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Gagal update' }, { status: 500 })
  return NextResponse.json({ success: true })
}
