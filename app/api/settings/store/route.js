import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { storeId, requireSubProduct, requireCustomerName } = body

  if (!storeId) return NextResponse.json({ error: 'storeId diperlukan' }, { status: 400 })

  const update = {}
  if (typeof requireSubProduct === 'boolean') update.require_sub_product = requireSubProduct
  if (typeof requireCustomerName === 'boolean') update.require_customer_name = requireCustomerName

  const { error } = await supabase
    .from('stores')
    .update(update)
    .eq('id', storeId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Gagal update' }, { status: 500 })

  return NextResponse.json({ success: true })
}
