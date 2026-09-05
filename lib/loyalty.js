import { isPro } from '@/lib/plan'

/**
 * Satu tempat untuk menjawab "pelanggan ini dapat diskon berapa?".
 *
 * TEMUAN B6. Sebelumnya `discountPercent` dikirim sebagai prop dari
 * app/c/[token]/page.js ke CashierForm dan dipakai langsung tanpa memeriksa
 * apa pun. Default kolom `stores.discount_percent` adalah 10, jadi SETIAP toko
 * memberi diskon 10% pada SETIAP transaksi -- termasuk toko yang tidak pernah
 * menyalakan fitur pelanggan dan pembeli yang baru pertama kali datang.
 *
 * Aturan yang benar: diskon hanya berlaku kalau
 *   1. toko benar-benar PRO saat ini (loyalitas adalah pembeda paket PRO), DAN
 *   2. pemilik menyalakan `pelanggan_enabled`, DAN
 *   3. pelanggannya teridentifikasi lewat nomor HP, DAN
 *   4. jumlah kunjungan SEBELUM transaksi ini sudah mencapai visit_threshold.
 */

export const DEFAULT_VISIT_THRESHOLD = 5
export const DEFAULT_DISCOUNT_PERCENT = 10

function intOr(value, fallback) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : fallback
}

/** Apakah program loyalitas hidup untuk toko ini. */
export function loyaltyEnabled(store) {
  return Boolean(store?.pelanggan_enabled) && isPro(store)
}

/**
 * @param store    baris stores (butuh subscription_*, pelanggan_enabled,
 *                 visit_threshold, discount_percent)
 * @param customer baris customers ATAU null kalau pelanggan belum dikenal
 */
export function loyaltyState(store, customer) {
  const enabled = loyaltyEnabled(store)
  const threshold = Math.max(1, intOr(store?.visit_threshold, DEFAULT_VISIT_THRESHOLD))
  const configured = Math.min(100, Math.max(0, intOr(store?.discount_percent, DEFAULT_DISCOUNT_PERCENT)))
  const visitCount = Math.max(0, intOr(customer?.visit_count, 0))
  const eligible = enabled && visitCount >= threshold && configured > 0

  return {
    enabled,
    threshold,
    visitCount,
    known: Boolean(customer),
    discountPercent: eligible ? configured : 0,
    configuredPercent: configured,
    eligible,
    visitsToGo: enabled ? Math.max(0, threshold - visitCount) : null,
  }
}

/** Diskon dalam rupiah, dibulatkan ke rupiah terdekat. */
export function discountAmount(subtotal, percent) {
  const base = Number(subtotal)
  const pct = Number(percent)
  if (!Number.isFinite(base) || base <= 0) return 0
  if (!Number.isFinite(pct) || pct <= 0) return 0
  return Math.min(base, Math.round((base * Math.min(100, pct)) / 100))
}
