import 'server-only'
import { createServiceClient } from '@/utils/supabase/service'

/**
 * Order langganan yang masih 'pending' setelah batas ini dianggap gagal.
 *
 * Midtrans memang punya masa berlaku sendiri, tetapi link pembayaran yang
 * ditinggalkan tetap terlihat "menunggu" di riwayat. Batas 60 menit membuat
 * daftar tidak menggantung dan mencegah order lama dipakai lagi tanpa sengaja.
 */
export const PENDING_ORDER_TTL_MINUTES = 60

/**
 * Tandai order pending yang sudah lewat masa berlaku sebagai 'gagal'.
 *
 * Dipanggil saat halaman billing dibuka dan sebelum order baru dibuat. Aman
 * dipanggil berulang: fungsi database hanya menyentuh baris yang masih
 * 'pending' dan lebih tua dari batas.
 */
export async function expireStaleSubscriptionOrders() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('expire_stale_subscription_orders', {
      p_minutes: PENDING_ORDER_TTL_MINUTES,
    })

    if (error) {
      // Jangan gagalkan halaman billing hanya karena pembersihan gagal. Order
      // pending tetap tampil, hanya belum berubah status.
      console.error('Gagal menandai order pending sebagai gagal', {
        code: error.code,
        message: error.message,
      })
      return 0
    }

    return Number(data ?? 0)
  } catch (error) {
    console.error('expireStaleSubscriptionOrders gagal', { message: error?.message })
    return 0
  }
}
