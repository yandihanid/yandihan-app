'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireStoreOwnership } from '@/lib/dal'
import { hasOnTableFeature } from '@/lib/plan'
import { isValidXenditSubAccountId, normalizeXenditSubAccountId } from '@/lib/xendit'

/**
 * Simpan Business ID sub-account Xendit milik toko.
 *
 * Tanpa nilai ini, invoice On the Table dibuat dengan akun Xendit utama
 * platform. Dengan nilai ini, invoice memakai header `for-user-id` sehingga
 * dana pelanggan masuk ke saldo sub-account toko.
 *
 * Kepemilikan diperiksa lewat DAL (bukan hanya RLS), dan penulisan memakai
 * `.select('id')` supaya UPDATE yang tidak mengenai baris apa pun tidak
 * dilaporkan sebagai berhasil.
 */
export async function updateXenditPayout(formData) {
  const storeId = String(formData.get('storeId') || '').trim()
  const raw = String(formData.get('xenditSubAccountId') || '').trim()

  if (!storeId) return { error: 'Toko tidak ditemukan. Muat ulang halaman.' }

  if (raw && !isValidXenditSubAccountId(raw)) {
    return {
      error:
        'Business ID sub-account tidak valid. Biasanya berupa 24 karakter huruf dan angka dari Dashboard Xendit.',
    }
  }

  const { store, error: ownErr } = await requireStoreOwnership(storeId)
  if (ownErr) return { error: ownErr }

  if (!hasOnTableFeature(store)) {
    return { error: 'Fitur On the Table belum aktif untuk toko ini.' }
  }

  const subAccountId = normalizeXenditSubAccountId(raw)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .update({ xendit_sub_account_id: subAccountId })
    .eq('id', store.id)
    .eq('user_id', store.user_id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Gagal menyimpan sub-account Xendit', {
      storeId: store.id,
      code: error.code,
      message: error.message,
    })
    return {
      error: /xendit_sub_account_id/.test(error.message || '')
        ? 'Kolom rekening Xendit belum terpasang. Jalankan migrasi 0019.'
        : 'Gagal menyimpan rekening Xendit. Coba lagi.',
    }
  }

  if (!data) return { error: 'Perubahan tidak tersimpan. Coba muat ulang halaman.' }

  revalidatePath('/dashboard/on-the-table')
  return { success: true, subAccountId }
}
