import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireUser, getMyStore } from '@/lib/dal'

const NO_STORE = { 'cache-control': 'private, no-store' }

export async function GET(req) {
  const { user, error: authErr } = await requireUser()
  if (authErr) return NextResponse.json({ error: authErr }, { status: 401, headers: NO_STORE })

  const url = new URL(req.url)
  const storeId = url.searchParams.get('storeId')

  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('id, name, price, stock, is_sub_product, image_url')
    .order('name', { ascending: true })

  if (storeId) {
    // Verify ownership
    const store = await getMyStore()
    if (!store || store.id !== storeId) {
      return NextResponse.json({ error: 'Toko tidak ditemukan atau bukan milik Anda' }, { status: 403, headers: NO_STORE })
    }
    query = query.eq('store_id', storeId)
  } else {
    const store = await getMyStore()
    if (!store) {
      return NextResponse.json({ error: 'Toko tidak ditemukan' }, { status: 404, headers: NO_STORE })
    }
    query = query.eq('store_id', store.id)
  }

  const { data: products, error } = await query

  if (error) {
    console.error('Gagal memuat produk', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Gagal memuat produk' }, { status: 500, headers: NO_STORE })
  }

  return NextResponse.json(products || [], { headers: NO_STORE })
}