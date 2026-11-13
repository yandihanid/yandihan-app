'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireStoreOwnership } from '@/lib/dal'
import { parseBankDetails } from '@/lib/storePayout'

/**
 * Simpan rekening pencairan milik toko.
 *
 * Rekening ini dipakai pengelola platform untuk mengirim uangnya ke toko
 * lewat API Disbursement Xendit (lihat lib/storePayout.js). Jadi isinya
 * harus benar: kalau rekening salah, uangnya ditolak bank dan uang toko
 * tertahan di saldo platform sampai dicoba ulang.
 *
 * Potongan platform (`payout_fee_percent`) TIDAK bisa diubah dari sini.
 * Itu hak pengelola platform, bukan hak pemilik toko -- kalau bisa diubah
 * toko, pemotongan fee bisa dibuat nol tanpa sepengetahuan platform.
 */
export async function updateStorePayoutSettings(formData) {
  const storeId = String(formData.get('storeId') || '').trim()
  if (!storeId) return { error: 'Toko tidak ditemukan. Muat ulang halaman.' }

  const { store, error: ownErr } = await requireStoreOwnership(storeId)
  if (ownErr) return { error: ownErr }

  const details = parseBankDetails({
    bankCode: formData.get('bankCode'),
    accountNumber: formData.get('accountNumber'),
    accountName: formData.get('accountName'),
  })
  if (details.error) return { error: details.error }

  const minimum = Number.parseInt(String(formData.get('payoutMinimum') || ''), 10)
  if (!Number.isFinite(minimum) || minimum < 0) {
    return { error: 'Minimum pencairan tidak valid' }
  }
  if (minimum > 100_000_000) {
    return { error: 'Minimum pencairan terlalu besar (maks Rp100.000.000)' }
  }

  const enabled = formData.get('payoutEnabled') === 'true' || formData.get('payoutEnabled') === 'on'

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .update({
      payout_bank_code: details.bankCode,
      payout_account_number: details.accountNumber,
      payout_account_name: details.accountName,
      payout_minimum_idr: minimum,
      payout_enabled: enabled,
    })
    .eq('id', store.id)
    .eq('user_id', store.user_id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Gagal menyimpan rekening pencairan', {
      storeId: store.id,
      code: error.code,
      message: error.message,
    })
    return {
      error: /payout_/.test(error.message || '')
        ? 'Kolom rekening pencairan belum terpasang. Jalankan migrasi 0022_store_payouts.sql.'
        : 'Gagal menyimpan rekening pencairan. Coba lagi.',
    }
  }

  if (!data) return { error: 'Perubahan tidak tersimpan. Coba muat ulang halaman.' }

  revalidatePath('/dashboard/on-the-table')
  return { success: true }
}
