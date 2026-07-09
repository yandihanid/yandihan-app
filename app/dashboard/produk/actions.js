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

  // --- diskon, self‑order, loyalty ---
  const discountPercentRaw = formData.get('discountPercent')
  const discountAmountRaw = formData.get('discountAmount')
  const selfOrderRaw = formData.get('selfOrder')
  const loyaltyPointsRaw = formData.get('loyaltyPoints')

  let discountPercent = null
  let discountAmount = null

  if (discountPercentRaw) {
    const val = parseFloat(discountPercentRaw)
    if (!isNaN(val) && val >= 0) discountPercent = val
  }
  if (discountAmountRaw) {
    const val = parseInt(discountAmountRaw, 10)
    if (!isNaN(val) && val >= 0) discountAmount = val
  }

  const selfOrderEnabled = selfOrderRaw === 'on' ? true : false

  let loyaltyPoints = 0
  if (loyaltyPointsRaw) {
    const val = parseInt(loyaltyPointsRaw, 10)
    if (!isNaN(val) && val >= 0) loyaltyPoints = val
  }

  // --- variants (JSON array) ---
  const variantsRaw = formData.get('variants')
  let variants = null
  if (variantsRaw) {
    try {
      const parsed = JSON.parse(variantsRaw)
      if (Array.isArray(parsed)) {
        variants = parsed
      }
    } catch {
      // ignore invalid variants
    }
  }

  const insertData = {
    store_id: storeId,
    name: name,
    price: parseInt(price, 10),
    stock: parseInt(stock, 10),
    discount_percent: discountPercent,
    discount_amount: discountAmount,
    self_order_enabled: selfOrderEnabled,
    loyalty_points: loyaltyPoints,
  }
  if (variants) {
    insertData.variants = variants
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
