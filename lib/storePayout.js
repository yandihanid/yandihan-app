import 'server-only'
import { randomUUID } from 'node:crypto'
import { createXenditDisbursement, isXenditConfigured } from '@/lib/xendit'
import { PAYOUT_BANK_CODES, isSupportedBankCode, parseBankDetails } from '@/lib/payoutBanks'

export { PAYOUT_BANK_CODES, isSupportedBankCode, parseBankDetails }

/**
 * Pencairan (disbursement) pendapatan toko.
 *
 * Kenapa ada file ini: pengajuan XenPlatform (sub-account) tidak disetujui,
 * jadi tidak ada cara memisahkan saldo per toko di sisi Xendit. Yang dipakai:
 *
 *   1. Semua invoice dibuat dengan satu akun Xendit milik platform. Uang
 *      pelanggan masuk ke saldo akun itu.
 *   2. Setiap pesanan meja yang lunas sudah tercatat di `table_orders`
 *      lengkap dengan `store_id`, jadi tahu uang itu milik toko mana.
 *   3. Modul ini menghitung saldo tiap toko, lalu mengirimkannya ke rekening
 *      bank yang didaftarkan toko lewat API Disbursement Xendit.
 *
 * Pemisahan uang ada di dua lapis: pencatatan (siapa pemilik uangnya, di
 * `table_orders.payout_id`) dan pengiriman (`store_payouts`).
 *
 * Aturan main yang dijaga file ini:
 *
 *   - Satu pesanan hanya boleh masuk satu pencairan. Penglaiman pesanan
 *     memakai `payout_id IS NULL` di balik UPDATE, jadi dua pencairan yang
 *     jalan bersamaan tidak mungkin mengambil pesanan yang sama.
 *   - Nominal pencairan dihitung ulang dari pesanan yang BENAR-BENAR
 *     terklaim, bukan dari perkiraan sebelum diklaim. Kalau ada pesanan yang
 *     masuk di antara penghitungan dan pengklaiman, nominalnya ikut masuk
 *     (dan kalau tidak, nominalnya tidak pernah lebih besar dari kenyataan).
 *   - external_id pencairan jadi kunci idempotensi. Percobaan kirim ulang
 *     memakai external_id yang sama, jadi Xendit tidak pernah mengirim uang
 *     dua kali untuk satu toko.
 */

export const PAYOUT_STATUS = {
  pending: 'pending',
  submitted: 'submitted',
  paid: 'paid',
  failed: 'failed',
}

/** Status pencairan yang masih berjalan; pencairan baru boleh dibuat. */
export const PAYOUT_OPEN_STATUSES = [PAYOUT_STATUS.pending, PAYOUT_STATUS.submitted]

export const DEFAULT_PAYOUT_MINIMUM_IDR = 10000

/**
 * Potongan platform untuk satu toko.
 *
 * Nilai per toko (diatur platform di halaman pencairan) mengalahkan nilai
 * bawaan platform di env. Persentase di luar 0-100 diabaikan supaya nominal
 * yang dikirim ke Xendit tidak pernah negatif atau lebih besar dari omzet.
 */
export function resolveFeePercent(store) {
  const perStore = store?.payout_fee_percent
  if (perStore !== null && perStore !== undefined && perStore !== '') {
    const value = Number(perStore)
    if (Number.isFinite(value) && value >= 0 && value <= 100) return value
  }

  const fallback = Number(process.env.PAYOUT_FEE_PERCENT || 0)
  return Number.isFinite(fallback) && fallback >= 0 && fallback <= 100 ? fallback : 0
}

/**
 * Nominal pencairan dari omzet toko.
 *
 * `gross` adalah jumlah subtotal pesanan (barang yang dijual), tidak
 * termasuk biaya layanan. Biaya layanan dibayar pelanggan ke platform dan
 * tidak ikut dicairkan ke toko.
 */
export function computePayoutAmount(gross, feePercent) {
  const base = Math.max(Number(gross) || 0, 0)
  const percent = Math.min(Math.max(Number(feePercent) || 0, 0), 100)
  const fee = Math.round((base * percent) / 100)
  return { fee, amount: Math.max(base - fee, 0) }
}

/** Batas minimum pencairan untuk satu toko. */
export function resolveMinimumAmount(store) {
  const value = Number(store?.payout_minimum_idr)
  if (Number.isFinite(value) && value >= 0) return value
  return DEFAULT_PAYOUT_MINIMUM_IDR
}

/** external_id pencairan: kunci idempotensi di sisi Xendit. */
export function payoutExternalId() {
  return `PAYOUT-${randomUUID()}`
}

/**
 * Saldo toko yang belum dicairkan.
 *
 * Sumbernya `table_orders` dengan status 'paid' dan `payout_id` NULL:
 * pesanan yang sudah dibayar (uangnya sudah masuk ke saldo Xendit platform)
 * dan belum dialokasikan ke pencairan mana pun.
 */
export async function getStoreBalance(supabase, storeId) {
  const { data, error } = await supabase
    .from('table_orders')
    .select('id, subtotal, service_fee, amount, paid_at, payout_id')
    .eq('store_id', storeId)
    .eq('status', 'paid')
    .is('payout_id', null)

  if (error) {
    return { error: 'Gagal menghitung saldo toko', orders: [], gross: 0, serviceFee: 0 }
  }

  const orders = data || []
  const gross = orders.reduce((sum, order) => sum + Number(order.subtotal ?? 0), 0)
  const serviceFee = orders.reduce((sum, order) => sum + Number(order.service_fee ?? 0), 0)

  return { error: null, orders, gross, serviceFee }
}

/** Ringkasan saldo satu toko, termasuk potongan dan nominal pencairan. */
export function summarizeBalance(store, balance) {
  const feePercent = resolveFeePercent(store)
  const { fee, amount } = computePayoutAmount(balance.gross, feePercent)
  const minimum = resolveMinimumAmount(store)

  return {
    gross: balance.gross,
    serviceFee: balance.serviceFee,
    fee,
    amount,
    feePercent,
    minimum,
    orderCount: balance.orders.length,
    eligible: amount >= minimum && balance.orders.length > 0,
  }
}

/**
 * Bentuk ringkas pencairan untuk dikembalikan ke pemanggil.
 * @returns {{ id, external_id, amount, gross_amount, fee_amount }}
 */
function payoutIdentity(payout) {
  return {
    id: payout.id,
    external_id: payout.external_id,
    amount: Number(payout.amount ?? 0),
    gross_amount: Number(payout.gross_amount ?? 0),
    fee_amount: Number(payout.fee_amount ?? 0),
  }
}

/**
 * Buat pencairan untuk satu toko, lalu kirim ke Xendit.
 *
 * Urutannya penting:
 *
 *   1. Cek syarat (toko mengaktifkan pencairan, rekening lengkap, Xendit
 *      terkonfigurasi, tidak ada pencairan lain yang sedang jalan).
 *   2. Hitung saldo buat cek batas minimum.
 *   3. Buat baris ledger (status `pending`) -- ini adalah "reservasi".
 *   4. Klaim pesanan: `payout_id` diisi di mana pun masih NULL.
 *   5. Hitung ulang nominal dari pesanan yang benar-benar terklaim.
 *   6. Kirim ke Xendit dengan external_id yang sudah dibuat di langkah 3.
 *
 * Kalau langkah 6 gagal, pesanan TETAP terklaim dan baris ledger menjadi
 * `failed`: uangnya belum terkirim, jadi saldo toko tidak boleh muncul lagi
 * sebagai "belum dicairkan" (kalau dilepas, pencairan berikutnya bisa
 * mengirim uang yang sama dua kali). Pengelola platform menekan "Kirim
 * ulang" memakai external_id yang sama.
 */
export async function createStorePayout(supabase, store) {
  const bankCode = String(store?.payout_bank_code || '').trim().toUpperCase()
  const accountNumber = String(store?.payout_account_number || '').trim()
  const accountName = String(store?.payout_account_name || '').trim()

  if (!store?.payout_enabled) {
    return {
      error: 'Pencairan belum diaktifkan untuk toko ini. Minta pemilik toko mengisi rekeningnya.',
    }
  }
  if (!isSupportedBankCode(bankCode) || !accountNumber || !accountName) {
    return { error: 'Rekening pencairan toko belum lengkap.' }
  }
  if (!isXenditConfigured()) {
    return { error: 'Xendit belum dikonfigurasi. Isi XENDIT_SECRET_KEY di server.' }
  }

  const { data: running, error: runningError } = await supabase
    .from('store_payouts')
    .select('id, status, external_id')
    .eq('store_id', store.id)
    .in('status', PAYOUT_OPEN_STATUSES)
    .limit(1)

  if (runningError) return { error: 'Gagal memeriksa pencairan yang sedang berjalan' }
  if (running && running.length) {
    return { error: 'Sudah ada pencairan yang sedang diproses untuk toko ini.' }
  }

  const balance = await getStoreBalance(supabase, store.id)
  if (balance.error) return { error: balance.error }
  if (!balance.orders.length) return { error: 'Tidak ada saldo yang belum dicairkan.' }

  const summary = summarizeBalance(store, balance)
  if (!summary.eligible) {
    return { error: `Saldo toko belum cukup untuk dicairkan (minimal ${summary.minimum}).` }
  }

  const externalId = payoutExternalId()

  const { data: payout, error: createError } = await supabase
    .from('store_payouts')
    .insert({
      store_id: store.id,
      external_id: externalId,
      gross_amount: summary.gross,
      fee_amount: summary.fee,
      service_fee_amount: summary.serviceFee,
      amount: summary.amount,
      order_count: summary.orderCount,
      period_start: earliestPaidAt(balance.orders),
      period_end: latestPaidAt(balance.orders),
      status: PAYOUT_STATUS.pending,
      bank_code: bankCode,
      account_number: accountNumber,
      account_holder_name: accountName,
    })
    .select('id, external_id, amount, gross_amount, fee_amount, status')
    .single()

  if (createError || !payout) {
    console.error('Gagal membuat catatan pencairan', {
      storeId: store.id,
      code: createError?.code,
      message: createError?.message,
    })
    return { error: 'Gagal membuat catatan pencairan' }
  }

  // Klaim pesanan. `payout_id IS NULL` membuat ini aman dari pencairan lain
  // yang berjalan bersamaan: hanya satu UPDATE yang bisa mengklaim tiap baris.
  const { data: claimed, error: claimError } = await supabase
    .from('table_orders')
    .update({ payout_id: payout.id })
    .eq('store_id', store.id)
    .eq('status', 'paid')
    .is('payout_id', null)
    .select('id, subtotal, service_fee, paid_at')

  if (claimError) {
    await markPayoutFailed(supabase, payout.id, 'Gagal menandai pesanan sebagai dicairkan')
    return { error: 'Gagal menandai pesanan sebagai dicairkan' }
  }

  const claimedOrders = claimed || []
  if (!claimedOrders.length) {
    await supabase.from('store_payouts').delete().eq('id', payout.id)
    return { error: 'Pesanan sudah diklaim pencairan lain. Coba lagi.' }
  }

  // Nominal dihitung ulang dari pesanan yang benar-benar terklaim.
  const claimedGross = claimedOrders.reduce((sum, order) => sum + Number(order.subtotal ?? 0), 0)
  const claimedServiceFee = claimedOrders.reduce(
    (sum, order) => sum + Number(order.service_fee ?? 0),
    0
  )
  const feePercent = resolveFeePercent(store)
  const { fee, amount } = computePayoutAmount(claimedGross, feePercent)
  const minimum = resolveMinimumAmount(store)

  if (amount < minimum) {
    await releaseClaimedOrders(supabase, claimedOrders.map((order) => order.id))
    await supabase.from('store_payouts').delete().eq('id', payout.id)
    return { error: `Saldo toko belum cukup untuk dicairkan (minimal ${minimum}).` }
  }

  const { error: amountError } = await supabase
    .from('store_payouts')
    .update({
      gross_amount: claimedGross,
      fee_amount: fee,
      service_fee_amount: claimedServiceFee,
      amount,
      order_count: claimedOrders.length,
      period_start: earliestPaidAt(claimedOrders),
      period_end: latestPaidAt(claimedOrders),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payout.id)

  if (amountError) {
    console.error('Gagal menyimpan nominal pencairan', {
      payoutId: payout.id,
      code: amountError.code,
      message: amountError.message,
    })
  }

  return submitPayout(supabase, {
    ...payout,
    store_id: store.id,
    amount,
    gross_amount: claimedGross,
    fee_amount: fee,
    bank_code: bankCode,
    account_number: accountNumber,
    account_holder_name: accountName,
  })
}

/**
 * Kirim pencairan ke Xendit dan catat hasilnya.
 *
 * external_id tidak diubah antar percobaan, jadi percobaan ulang tidak
 * pernah menjadi dua pencairan.
 */
export async function submitPayout(supabase, payout) {
  const response = await createXenditDisbursement({
    externalId: payout.external_id,
    reference: `Pencairan toko Yandihan ${payout.store_id ?? ''}`.trim(),
    amount: Number(payout.amount ?? 0),
    bankCode: payout.bank_code,
    accountNumber: payout.account_number,
    accountHolderName: payout.account_holder_name,
    description: 'Pencairan pendapatan toko Yandihan',
    email: payout.email || undefined,
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok || !data?.id) {
    const reason =
      data?.failure_reason || data?.message || data?.error_code || `HTTP ${response.status}`
    await markPayoutFailed(supabase, payout.id, reason)

    console.error('Gagal mengirim pencairan ke Xendit', {
      payoutId: payout.id,
      status: response.status,
      code: data?.error_code || data?.code,
      reason,
    })

    return { error: `Pencairan gagal: ${reason}` }
  }

  const { error: updateError } = await supabase
    .from('store_payouts')
    .update({
      status: PAYOUT_STATUS.submitted,
      xendit_disbursement_id: data.id,
      submitted_at: new Date().toISOString(),
      failure_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payout.id)

  if (updateError) {
    console.error('Gagal menyimpan status pencairan', {
      payoutId: payout.id,
      code: updateError.code,
      message: updateError.message,
    })
  }

  return { payout: payoutIdentity({ ...payout, id: payout.id }), disbursement: data }
}

/**
 * Tandai pencairan gagal. Pesanan yang sudah diklaim TIDAK dilepas: uangnya
 * belum terkirim, jadi saldo toko tidak boleh muncul lagi sebagai "belum
 * dicairkan" (kalau dilepas, pencairan berikutnya bisa mengirim uang yang
 * sama dua kali). Pengelola platform bisa mengirim ulang dengan external_id
 * yang sama.
 */
export async function markPayoutFailed(supabase, payoutId, reason) {
  const { error } = await supabase
    .from('store_payouts')
    .update({
      status: PAYOUT_STATUS.failed,
      failure_reason: String(reason || '').slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payoutId)

  if (error) {
    console.error('Gagal menandai pencairan gagal', {
      payoutId,
      code: error.code,
      message: error.message,
    })
  }
}

/** Lepaskan klaim pesanan (dipakai hanya saat pencairan dibatalkan). */
export async function releaseClaimedOrders(supabase, orderIds) {
  if (!orderIds?.length) return
  await supabase
    .from('table_orders')
    .update({ payout_id: null })
    .in('id', orderIds)
    .is('payout_id', null)
}

function earliestPaidAt(orders) {
  const times = orders
    .map((order) => (order.paid_at ? new Date(order.paid_at).getTime() : null))
    .filter((time) => Number.isFinite(time))
  if (!times.length) return new Date().toISOString()
  return new Date(Math.min(...times)).toISOString()
}

function latestPaidAt(orders) {
  const times = orders
    .map((order) => (order.paid_at ? new Date(order.paid_at).getTime() : null))
    .filter((time) => Number.isFinite(time))
  if (!times.length) return new Date().toISOString()
  return new Date(Math.max(...times)).toISOString()
}
