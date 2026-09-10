'use server'

// KEAMANAN (temuan A5): ketiga action di file ini sebelumnya tidak punya
// pemeriksaan auth sama sekali. `addProduct` menyisipkan produk ke `storeId`
// apa pun yang dikirim client, sementara `updateStock` dan `deleteProduct`
// beroperasi pada `productId` apa pun. Sekarang semuanya lewat lib/dal.js.
//
// Ini tetap wajib meskipun proxy.js sudah menjaga /dashboard: Server Function
// di-POST ke route tempat ia dipakai, dan otorisasi per-baris memang tidak
// bisa dikerjakan di proxy (lihat catatan di proxy.js).

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireStoreOwnership, requireProductOwnership } from '@/lib/dal'

export async function addProduct(formData) {
  const name = String(formData.get('name') || '').trim()
  const price = formData.get('price')
  const stock = formData.get('stock')

  const { store, error: ownErr } = await requireStoreOwnership(formData.get('storeId'))
  if (ownErr) return { error: ownErr }

  if (!name || price === null || stock === null) return { error: 'Data tidak lengkap' }
  if (name.length > 120) return { error: 'Nama produk terlalu panjang (maks 120 karakter)' }

  const priceNum = parseInt(price, 10)
  const stockNum = parseInt(stock, 10)

  if (isNaN(priceNum) || priceNum < 0) return { error: 'Harga harus angka nol atau lebih' }
  if (isNaN(stockNum) || stockNum < 0) return { error: 'Stok harus angka nol atau lebih' }

  const supabase = await createClient()
  const { error } = await supabase.from('products').insert({
    store_id: store.id,
    name,
    price: priceNum,
    stock: stockNum,
  })

  if (error) {
    // 23505 = unique_violation. Index unik products(store_id, lower(name))
    // dibuat di supabase/migrations/0003_transaction_rpc.sql.
    if (error.code === '23505') return { error: `Produk "${name}" sudah ada di toko ini` }
    return { error: 'Gagal menambahkan produk' }
  }
  revalidatePath('/dashboard/produk')
  return { success: true }
}

export async function updateStock(formData) {
  const newStock = parseInt(formData.get('newStock'), 10)

  const { product, error: ownErr } = await requireProductOwnership(formData.get('productId'))
  if (ownErr) return { error: ownErr }

  if (isNaN(newStock) || newStock < 0) return { error: 'Stok tidak valid' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', product.id)
    .eq('store_id', product.store_id)

  if (error) return { error: 'Gagal mengubah stok' }
  revalidatePath('/dashboard/produk')
  return { success: true }
}

export async function deleteProduct(formData) {
  const { product, error: ownErr } = await requireProductOwnership(formData.get('productId'))
  if (ownErr) return { error: ownErr }

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', product.id)
    .eq('store_id', product.store_id)

  if (error) return { error: 'Gagal menghapus produk' }
  revalidatePath('/dashboard/produk')
  return { success: true }
}
