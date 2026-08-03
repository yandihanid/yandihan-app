'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addProduct(formData) {
  const supabase = await createClient()
  const storeId = formData.get('storeId')
  const name = formData.get('name')
  const price = formData.get('price')
  const stock = formData.get('stock')

  if (!storeId || !name || !price || stock === null) return { error: 'Data tidak lengkap' }

  // Validate price and stock are numbers
  const priceNum = parseInt(price, 10)
  const stockNum = parseInt(stock, 10)
  
  if (isNaN(priceNum) || priceNum < 0) return { error: 'Harga harus angka positif' }
  if (isNaN(stockNum) || stockNum < 0) return { error: 'Stok harus angka positif' }

  const { error } = await supabase.from('products').insert({
    store_id: storeId,
    name,
    price: priceNum,
    stock: stockNum,
  })

  if (error) return { error: 'Gagal menambahkan produk' }
  revalidatePath('/dashboard/produk')
  return { success: true }
}

export async function updateStock(formData) {
  const supabase = await createClient()
  const productId = formData.get('productId')
  const newStock = parseInt(formData.get('newStock'), 10)

  if (!productId || isNaN(newStock) || newStock < 0) {
    return { error: 'Stok tidak valid' }
  }

  const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', productId)
  if (error) return { error: 'Gagal mengubah stok' }
  revalidatePath('/dashboard/produk')
  return { success: true }
}

export async function deleteProduct(formData) {
  const supabase = await createClient()
  const productId = formData.get('productId')

  if (!productId) return { error: 'ID produk tidak valid' }

  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) return { error: 'Gagal menghapus produk' }
  revalidatePath('/dashboard/produk')
  return { success: true }
}

