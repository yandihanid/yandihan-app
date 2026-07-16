'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addProduct(formData) {
  const supabase = await createClient()
  const storeId = formData.get('storeId')
  const name = formData.get('name')
  const price = formData.get('price')
  const stock = formData.get('stock')

  if (!storeId || !name || !price || stock === null || stock === undefined) return { error: 'Data tidak lengkap' }

  // --- self‑order, loyalty ---
  const selfOrderRaw = formData.get('selfOrder')
  const loyaltyPointsRaw = formData.get('loyaltyPoints')

  const selfOrderEnabled = selfOrderRaw === 'on' ? true : false

  let loyaltyPoints = 0
  if (loyaltyPointsRaw) {
    const val = parseInt(loyaltyPointsRaw, 10)
    if (!isNaN(val) && val >= 0) loyaltyPoints = val
  }

  const insertData = {
    store_id: storeId,
    name: name,
    price: parseInt(price, 10),
    stock: parseInt(stock, 10),
    self_order_enabled: selfOrderEnabled,
    loyalty_points: loyaltyPoints,
  }

  const { error } = await supabase
    .from('products')
    .insert(insertData)

  if (error) {
    console.error(error)
    return { error: 'Gagal menambahkan produk' }
  }

  revalidatePath('/dashboard/produk')
  return { success: true }
}
