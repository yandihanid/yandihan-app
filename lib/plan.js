/**
 * Satu-satunya sumber kebenaran untuk harga & batas paket.
 *
 * Sebelumnya harga PRO tersebar di 4 tempat dengan 4 nilai berbeda
 * (landing 78.000, /api/pricing 78.000, pricingConstants 58.000). Semua sekarang
 * membaca file ini.
 */

export const PRO_MONTHLY_PRICE_IDR = 78000
export const PRO_ANNUAL_PRICE_IDR = 780000
export const PRO_PRICE_IDR = PRO_MONTHLY_PRICE_IDR

export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'PRO-1M',
    label: 'Bulanan',
    period: 'bulan',
    price: PRO_MONTHLY_PRICE_IDR,
    days: 30,
    description: 'Dibayar per 30 hari, tanpa komitmen',
  },
  annual: {
    id: 'PRO-1Y',
    label: 'Tahunan',
    period: 'tahun',
    price: PRO_ANNUAL_PRICE_IDR,
    days: 365,
    description: '12 bulan hemat Rp 156.000 (Rp 65.000/bln)',
    badge: 'HEMAT 17%',
  },
}

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
