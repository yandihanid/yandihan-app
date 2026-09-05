import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { storeId } = body

  if (!storeId) return NextResponse.json({ error: 'storeId diperlukan' }, { status: 400 })

  // Whitelist of columns the client is allowed to toggle
  const ALLOWED_FIELDS = ['require_sub_product', 'require_customer_name', 'waiting_list_enabled']

  const update = {}
  for (const field of ALLOWED_FIELDS) {
    if (typeof body[field] === 'boolean') update[field] = body[field]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Tidak ada perubahan valid' }, { status: 400 })
  }

  const { error } = await supabase
    .from('stores')
    .update(update)
    .eq('id', storeId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Gagal update' }, { status: 500 })

  return NextResponse.json({ success: true })
}
