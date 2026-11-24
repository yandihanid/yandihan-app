import 'server-only'
import { createServiceClient } from '@/utils/supabase/service'

/**
 * Catat tindakan sensitif ke tabel audit_logs.
 *
 * Dipanggil dari Server Action atau Route Handler setelah aksi sensitif
 * selesai (rotasi token, tambah/hapus kasir, ubah paket, dll).
 *
 * Data rahasia (sandi, token, cookie) JANGAN dimasukkan ke details.
 *
 * @param {Object} params
 * @param {string} params.storeId - ID toko (bisa null untuk aksi platform)
 * @param {string} params.userId - ID user Supabase Auth (bisa null)
 * @param {string} params.action - Nama aksi, mis. 'rotate_cashier_token'
 * @param {string} params.targetType - 'cashier' | 'store' | 'subscription' | 'setting'
 * @param {string} params.targetId - ID target yang diubah
 * @param {Object} [params.details] - Data tambahan (JSON-safe, tanpa rahasia)
 * @param {string} [params.ipAddress] - IP pemanggil
 * @param {string} [params.userAgent] - User-Agent pemanggil
 * @returns {Promise<void>}
 */
export async function auditLog({
  storeId,
  userId,
  action,
  targetType,
  targetId,
  details = {},
  ipAddress,
  userAgent,
}) {
  try {
    const supabase = createServiceClient()
    await supabase.from('audit_logs').insert({
      store_id: storeId || null,
      user_id: userId || null,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      details,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    })
  } catch {
    // Gagal menulis audit log tidak boleh memblokir aksi utama.
    // Error akan ditangkap oleh monitoring (jika ada) tapi aplikasi tetap jalan.
  }
}
