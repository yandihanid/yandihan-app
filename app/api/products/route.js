import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireUser, getMyStore } from '@/lib/dal'

const NO_STORE = { 'cache-control': 'private, no-store' }

/**
 * Ambil katalog produk toko.
 *
 * Kolom `category` baru ada setelah migrasi 0023. Kalau belum ada, produknya
 * tetap dikirim (tanpa kategori) supaya kasir tetap bisa berjualan -- daftar
 * produk kosong akan menghentikan seluruh toko.
 */
async function loadProducts(supabase, apply) {
  const withCategory = await apply(
    supabase.from('products').select('id, name, price, stock, is_sub_product, image_url, category')
  )
  if (!withCategory?.error) return withCategory

  const fallback = await apply(
    supabase.from('products').select('id, name, price, stock, is_sub_product, image_url')
  )
  return fallback?.error ? withCategory : fallback
}

export async function GET(req) {
  const { user, error: authErr } = await requireUser()
  if (authErr) return NextResponse.json({ error: authErr }, { status: 401, headers: NO_STORE })

  const url = new URL(req.url)
  const storeId = url.searchParams.get('storeId')

  const supabase = await createClient()

  const store = await getMyStore()
  if (!store) {
    return NextResponse.json({ error: 'Toko tidak ditemukan' }, { status: 404, headers: NO_STORE })
  }

  // Verify ownership
  const targetStoreId = storeId || store.id
  if (storeId && store.id !== storeId) {
    return NextResponse.json(
      { error: 'Toko tidak ditemukan atau bukan milik Anda' },
      { status: 403, headers: NO_STORE }
    )
  }

  const { data: products, error } = await loadProducts(supabase, (query) =>
    query.eq('store_id', targetStoreId).order('name', { ascending: true })
  )

  if (error) {
    console.error('Gagal memuat produk', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Gagal memuat produk' }, { status: 500, headers: NO_STORE })
  }

  return NextResponse.json(products || [], { headers: NO_STORE })
}
