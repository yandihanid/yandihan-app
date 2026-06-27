'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCashier(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const storeId = formData.get('storeId')
  const name = formData.get('name')
  if (!storeId || !name) return { error: 'Data tidak lengkap' }

  // Check subscription tier
  const { data: store } = await supabase
    .from('stores')
    .select('subscription_tier')
    .eq('id', storeId)
    .single()

  if (store?.subscription_tier === 'FREE') {
    const { count } = await supabase
      .from('cashiers')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
    if (count >= 1) {
      return { error: 'Batas kasir (1 Kasir/Weblink) untuk paket GRATIS. Upgrade ke PRO untuk menambah kasir.' }
    }
  }

  const { error } = await supabase
    .from('cashiers')
    .insert({ store_id: storeId, name })

  if (error) return { error: 'Gagal menambahkan kasir' }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function deleteCashier(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const cashierId = formData.get('cashierId')
  if (!cashierId) return { error: 'Missing cashier ID' }

  // Verify the cashier belongs to user's store before deleting
  const { data: cashier } = await supabase
    .from('cashiers')
    .select('id, store_id, stores!inner(user_id)')
    .eq('id', cashierId)
    .single()

  if (!cashier || cashier.stores.user_id !== user.id) {
    return { error: 'Tidak diizinkan menghapus kasir ini' }
  }

  const { error } = await supabase
    .from('cashiers')
    .delete()
    .eq('id', cashierId)

  if (error) {
    console.error(error)
    return { error: 'Gagal menghapus kasir' }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}
