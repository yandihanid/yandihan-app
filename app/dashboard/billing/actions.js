'use server'

import { createClient } from '@/utils/supabase/server'
import { requireUser } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

export async function deletePendingOrder(orderId) {
  if (!orderId) return { error: 'Order ID tidak valid' }

  const { user, error: authErr } = await requireUser()
  if (authErr) return { error: authErr }

  const supabase = await createClient()

  // Hanya boleh menghapus order yang statusnya belum lunas/pending
  const { data: order } = await supabase
    .from('subscription_orders')
    .select('order_id, status, user_id')
    .eq('order_id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!order) return { error: 'Order tidak ditemukan' }
  if (order.status === 'paid') {
    return { error: 'Order yang sudah lunas tidak dapat dihapus' }
  }

  const { error: delErr } = await supabase
    .from('subscription_orders')
    .delete()
    .eq('order_id', orderId)
    .eq('user_id', user.id)

  if (delErr) {
    return { error: 'Gagal menghapus order pembayaran' }
  }

  revalidatePath('/dashboard/billing')
  return { success: true }
}
