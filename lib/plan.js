/**
 * Satu-satunya sumber kebenaran untuk harga & batas paket.
 *
 * Sebelumnya harga PRO tersebar di 4 tempat dengan 4 nilai berbeda
 * (landing 78.000, /api/pricing 78.000, pricingConstants 58.000,
 * tagihan Midtrans 189.000). Semua sekarang membaca file ini.
 */

export const PRO_PRICE_IDR = 78000

export const PLAN_LIMITS = {
  // Paket GRATIS: transaksi tanpa batas, tetap 1 kasir.
  FREE: { maxCashiers: 1 },
  PRO: { maxCashiers: Infinity },
}

/**
 * Apakah toko benar-benar PRO *saat ini*.
 *
 * `subscription_end_date` NULL diperlakukan sebagai aktif tanpa batas waktu —
 * itu jalur pemberian manual lewat Supabase dashboard, dan kita tidak mau
 * mendowngrade toko yang di-grandfather. Tanggal yang sudah lewat = kedaluwarsa.
 */
export function isPro(store) {
  if (!store || store.subscription_tier !== 'PRO') return false
  if (!store.subscription_end_date) return true
  return new Date(store.subscription_end_date).getTime() > Date.now()
}

export function planTier(store) {
  return isPro(store) ? 'PRO' : 'FREE'
}

export function planLimits(store) {
  return PLAN_LIMITS[planTier(store)]
}

export function maxCashiers(store) {
  return planLimits(store).maxCashiers
}

/** Perpanjang, jangan timpa: pembayaran lebih awal tidak menghanguskan sisa masa aktif. */
export function extendSubscription(currentEndDate, days = 30) {
  const now = Date.now()
  const current = currentEndDate ? new Date(currentEndDate).getTime() : 0
  const base = Number.isFinite(current) && current > now ? current : now
  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString()
}
