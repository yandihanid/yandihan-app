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
import { parseCategory } from '@/lib/catalog'

export async function addProduct(formData) {
  const name = String(formData.get('name') || '').trim()
  const price = formData.get('price')
  const stock = formData.get('stock')
  const { category, error: categoryError } = parseCategory(formData.get('category'))
  const rawImage = String(formData.get('imageUrl') || '').trim()
  const imageUrl = rawImage && (rawImage.startsWith('http://') || rawImage.startsWith('https://') || rawImage.startsWith('data:image/'))
    ? rawImage
    : null

  const { store, error: ownErr } = await requireStoreOwnership(formData.get('storeId'))
  if (ownErr) return { error: ownErr }

  if (categoryError) return { error: categoryError }
  if (!name || price === null || stock === null) return { error: 'Data tidak lengkap' }
  if (name.length > 120) return { error: 'Nama produk terlalu panjang (maks 120 karakter)' }

  const priceNum = parseInt(price, 10)
  const stockNum = parseInt(stock, 10)

  if (isNaN(priceNum) || priceNum < 0) return { error: 'Harga harus angka nol atau lebih' }
  if (isNaN(stockNum) || stockNum < 0) return { error: 'Stok harus angka nol atau lebih' }

  const supabase = await createClient()
  const insert = (row) =>
    supabase
      .from('products')
      .insert(row)
      .select('id')
      .single()

  const row = {
    store_id: store.id,
    name,
    price: priceNum,
    stock: stockNum,
    // Semua produk boleh langsung dijual. Klasifikasi produk utama /
    // sub-produk dihapus; kategori (bukan jenis) yang mengelompokkan menu.
    is_sub_product: false,
    category,
    image_url: imageUrl,
  }

  let { data: created, error } = await insert(row)

  // Kolom `category` belum ada sebelum migrasi 0023. Coba lagi tanpa kolom
  // itu supaya produk tetap bisa masuk (kategori bisa diisi belakangan).
  if (error && (error.code === '42703' || error.code === 'PGRST204')) {
    const { category: _ignored, ...rowWithoutCategory } = row
    const retry = await insert(rowWithoutCategory)
    created = retry.data
    error = retry.error
  }

  if (error) {
    // 23505 = unique_violation. Index unik products(store_id, lower(name))
    // dibuat di supabase/migrations/0003_transaction_rpc.sql.
    if (error.code === '23505') return { error: `Produk "${name}" sudah ada di toko ini` }
    return { error: 'Gagal menambahkan produk' }
  }
  revalidatePath('/dashboard/produk')
  // id produk dikembalikan supaya form bisa memakainya sebagai key: begitu
  // produk tersimpan, pratinjau foto me-mount ulang dan ikut terbersihkan.
  return { success: true, id: created?.id ?? null }
}

export async function updateStock(formData) {
  const newStock = parseInt(formData.get('newStock'), 10)
  const currentStock = parseInt(formData.get('currentStock'), 10)

  const { product, error: ownErr } = await requireProductOwnership(formData.get('productId'))
  if (ownErr) return { error: ownErr }

  if (isNaN(newStock) || newStock < 0 || isNaN(currentStock) || currentStock < 0) {
    return { error: 'Stok tidak valid' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', product.id)
    .eq('store_id', product.store_id)
    .eq('stock', currentStock)
    .select('id')
    .maybeSingle()

  if (error) return { error: 'Gagal mengubah stok' }
  if (!data) {
    return { error: 'Stok sudah berubah karena transaksi lain. Muat ulang lalu coba lagi.' }
  }
  revalidatePath('/dashboard/produk')
  return { success: true }
}

/**
 * Ubah kategori produk.
 *
 * Kategori kosong berarti "tanpa kategori": produknya tetap tampil, hanya
 * dikelompokkan di bawah "Umum" di menu kasir.
 */
export async function updateProductCategory(formData) {
  const { category, error: categoryError } = parseCategory(formData.get('category'))
  if (categoryError) return { error: categoryError }

  const { product, error: ownErr } = await requireProductOwnership(formData.get('productId'))
  if (ownErr) return { error: ownErr }

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ category })
    .eq('id', product.id)
    .eq('store_id', product.store_id)

  if (error) return { error: 'Gagal mengubah kategori' }
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
