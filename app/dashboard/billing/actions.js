'use server'

import { createClient } from '@/utils/supabase/server'
import { requireUser } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

export async function markOrderFailed(orderId) {
  if (!orderId) return { error: 'Order ID tidak valid' }

  const { user, error: authErr } = await requireUser()
  if (authErr) return { error: authErr }

  const supabase = await createClient()

  // Hanya boleh menandai gagal order yang statusnya belum lunas
  const { data: order } = await supabase
    .from('subscription_orders')
    .select('order_id, status, user_id')
    .eq('order_id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!order) return { error: 'Order tidak ditemukan' }
  if (order.status === 'paid') {
    return { error: 'Order yang sudah lunas tidak dapat diubah' }
  }

  const { error: updErr } = await supabase
    .from('subscription_orders')
    .update({ status: 'gagal', updated_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('user_id', user.id)

  if (updErr) {
    return { error: 'Gagal memperbarui status order' }
  }

  revalidatePath('/dashboard/billing')
  return { success: true }
}
