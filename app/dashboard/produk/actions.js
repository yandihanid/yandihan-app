'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addProduct(formData) {
  const supabase = await createClient()
  const storeId = formData.get('storeId')
  const name = formData.get('name')
  const price = formData.get('price')

  if (!storeId || !name || !price) return { error: 'Data tidak lengkap' }

  const { error } = await supabase
    .from('products')
    .insert({
      store_id: storeId,
      name: name,
      price: price
    })

  if (error) {
    console.error(error)
    return { error: 'Gagal menambahkan produk' }
  }

  revalidatePath('/dashboard/produk')
  return { success: true }
}
