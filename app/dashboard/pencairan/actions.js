'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/utils/supabase/service'
import { getCurrentUser } from '@/lib/dal'
import { isPlatformAdmin } from '@/lib/platform'
import { formatRupiah } from '@/lib/format'
import {
  PAYOUT_STATUS,
  createStorePayout,
  markPayoutFailed,
  submitPayout,
} from '@/lib/storePayout'
import { getXenditDisbursement, isXenditDisbursedStatus, isXenditDisbursementFailedStatus } from '@/lib/xendit'

/**
 * Aksi pencairan untuk pengelola platform.
 *
 * Semua aksi di file ini menolak siapa pun yang id-nya tidak terdaftar di
 * PLATFORM_ADMIN_USER_IDS. Pemeriksaan dilakukan di server pada setiap aksi,
 * bukan hanya saat halaman dibuka: server action bisa dipanggil dari mana
 * saja, jadi halaman yang tertutup bukan lagi pagar.
 */

const STORE_PAYOUT_FIELDS =
  'id, name, payout_enabled, payout_bank_code, payout_account_number, payout_account_name, payout_fee_percent, payout_minimum_idr'

async function requirePlatformAdmin() {
  const user = await getCurrentUser()
  if (!user) return { user: null, error: 'Sesi berakhir. Silakan masuk kembali.' }
  if (!isPlatformAdmin(user)) {
    return { user: null, error: 'Hanya pengelola platform yang bisa menjalankan pencairan.' }
  }
  return { user, error: null }
}

/**
 * Kirim pencairan untuk satu toko.
 *
 * Namanya dibedakan dari `createStorePayout` di lib/storePayout.js supaya
 * tidak bentrok saat keduanya dipakai di file yang sama.
 */
export async function runStorePayoutAction(formData) {
  const storeId = String(formData.get('storeId') || '').trim()
  if (!storeId) return { error: 'Toko tidak ditemukan.' }

  const { error: adminErr } = await requirePlatformAdmin()
  if (adminErr) return { error: adminErr }

  const service = createServiceClient()
  const { data: store } = await service
    .from('stores')
    .select(STORE_PAYOUT_FIELDS)
    .eq('id', storeId)
    .maybeSingle()

  if (!store) return { error: 'Toko tidak ditemukan.' }

  const result = await createStorePayout(service, store)
  if (result.error) return result

  revalidatePath('/dashboard/pencairan')
  revalidatePath('/dashboard/on-the-table')
  return {
    success: true,
    message: `Pencairan ${formatRupiah(result.payout?.amount ?? 0)} untuk ${store.name} dikirim ke Xendit.`,
    payout: result.payout,
  }
}

/**
 * Kirim ulang pencairan yang gagal.
 *
 * external_id dipakai lagi, jadi kalau Xendit sebenarnya sudah membuat
 * pencairan (mis. jawabannya tidak sampai ke kita), uangnya tidak terkirim
 * dua kali: Xendit menolak external_id yang sama.
 */
export async function retryStorePayoutAction(formData) {
  const payoutId = String(formData.get('payoutId') || '').trim()
  if (!payoutId) return { error: 'Pencairan tidak ditemukan.' }

  const { error: adminErr } = await requirePlatformAdmin()
  if (adminErr) return { error: adminErr }

  const service = createServiceClient()
  const { data: payout } = await service
    .from('store_payouts')
    .select(
      'id, store_id, external_id, amount, gross_amount, fee_amount, status, bank_code, account_number, account_holder_name, xendit_disbursement_id'
    )
    .eq('id', payoutId)
    .maybeSingle()

  if (!payout) return { error: 'Pencairan tidak ditemukan.' }
  if (payout.status === PAYOUT_STATUS.paid) {
    return { error: 'Pencairan ini sudah selesai.' }
  }
  if (payout.status === PAYOUT_STATUS.submitted) {
    return { error: 'Pencairan ini sudah dikirim ke Xendit. Gunakan "Periksa status".' }
  }

  const result = await submitPayout(service, payout)
  if (result.error) return result

  revalidatePath('/dashboard/pencairan')
  return { success: true, message: 'Pencairan dikirim ulang ke Xendit.' }
}

/**
 * Periksa status pencairan langsung ke Xendit.
 *
 * Dipakai kalau callback dari Xendit tidak sampai. Status di database
 * diperbarui dari jawaban Xendit, jadi tidak perlu menunggu webhook.
 */
export async function checkStorePayoutAction(formData) {
  const payoutId = String(formData.get('payoutId') || '').trim()
  if (!payoutId) return { error: 'Pencairan tidak ditemukan.' }

  const { error: adminErr } = await requirePlatformAdmin()
  if (adminErr) return { error: adminErr }

  const service = createServiceClient()
  const { data: payout } = await service
    .from('store_payouts')
    .select('id, status, xendit_disbursement_id')
    .eq('id', payoutId)
    .maybeSingle()

  if (!payout) return { error: 'Pencairan tidak ditemukan.' }
  if (!payout.xendit_disbursement_id) {
    return { error: 'Pencairan ini belum pernah sampai ke Xendit. Tekan "Kirim ulang".' }
  }

  const disbursement = await getXenditDisbursement(payout.xendit_disbursement_id)
  if (!disbursement) {
    return { error: 'Xendit tidak menjawab. Coba lagi nanti.' }
  }

  let status = payout.status
  let message = `Status pencairan di Xendit: ${disbursement.status || 'tidak diketahui'}.`

  if (isXenditDisbursedStatus(disbursement)) {
    status = PAYOUT_STATUS.paid
    message = 'Uang sudah masuk ke rekening toko.'
    await service
      .from('store_payouts')
      .update({
        status,
        paid_at: new Date().toISOString(),
        failure_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payout.id)
  } else if (isXenditDisbursementFailedStatus(disbursement)) {
    status = PAYOUT_STATUS.failed
    message = disbursement.failure_reason || 'Pencairan ditolak Xendit.'
    await markPayoutFailed(service, payout.id, message)
  }

  revalidatePath('/dashboard/pencairan')
  return { success: true, message }
}

/**
 * Ubah potongan platform untuk satu toko.
 *
 * Nilai ini hanya boleh diubah pengelola platform: kalau toko bisa mengubah
 * sendiri, pemotongan fee bisa dibuat nol tanpa sepengetahuan platform.
 */
export async function updateStorePayoutFeeAction(formData) {
  const storeId = String(formData.get('storeId') || '').trim()
  const rawPercent = String(formData.get('feePercent') || '').trim()

  const { error: adminErr } = await requirePlatformAdmin()
  if (adminErr) return { error: adminErr }

  const percent = rawPercent === '' ? null : Number(rawPercent)
  if (percent !== null && (!Number.isFinite(percent) || percent < 0 || percent > 100)) {
    return { error: 'Potongan harus antara 0 dan 100 persen.' }
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('stores')
    .update({ payout_fee_percent: percent })
    .eq('id', storeId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Gagal menyimpan potongan platform', {
      storeId,
      code: error.code,
      message: error.message,
    })
    return { error: 'Gagal menyimpan potongan platform.' }
  }
  if (!data) return { error: 'Perubahan tidak tersimpan. Coba muat ulang halaman.' }

  revalidatePath('/dashboard/pencairan')
  return { success: true }
}
