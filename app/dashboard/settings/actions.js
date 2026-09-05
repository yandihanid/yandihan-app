'use server'

// KEAMANAN (temuan A6): `addCashier` sudah memanggil getUser(), tapi lookup
// tokonya `.eq('id', storeId).single()` TANPA `.eq('user_id', user.id)`.
// Akibatnya pemilik toko A bisa mencetak token kasir di dalam toko orang lain
// hanya dengan menukar `storeId` di payload. Sekarang lewat lib/dal.js.

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'node:crypto'
import { requireStoreOwnership, requireCashierOwnership } from '@/lib/dal'
import { maxCashiers, planTier } from '@/lib/plan'

// Token kasir dibuat di sini, bukan diserahkan ke DEFAULT kolom DB.
// Sebelumnya `insert({ store_id, name })` tidak pernah mengirim `token`, jadi
// kekuatan kredensial POS bergantung pada default yang tidak ada di repo.
// 24 byte = 192 bit, base64url supaya aman dipakai sebagai segmen URL /c/<token>.
function generateCashierToken() {
  return randomBytes(24).toString('base64url')
}

export async function addCashier(formData) {
  const name = String(formData.get('name') || '').trim()

  const { store, error: ownErr } = await requireStoreOwnership(formData.get('storeId'))
  if (ownErr) return { error: ownErr }
  if (!name) return { error: 'Nama kasir wajib diisi' }
  if (name.length > 80) return { error: 'Nama kasir terlalu panjang (maks 80 karakter)' }

  const supabase = await createClient()

  // Batas paket dibaca dari lib/plan.js (satu sumber), dan isPro() di dalamnya
  // ikut memeriksa subscription_end_date — jadi PRO yang sudah kedaluwarsa
  // kembali dibatasi seperti GRATIS (temuan C9).
  const limit = maxCashiers(store)
  if (Number.isFinite(limit)) {
    const { count, error: countErr } = await supabase
      .from('cashiers')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)

    // count bisa null kalau query gagal. `null >= 1` itu false, yang dulu
    // berarti "kuota tak terbatas" (temuan C7). Sekarang gagal = tolak.
    if (countErr || count === null || count === undefined) {
      return { error: 'Gagal memeriksa jumlah kasir. Coba lagi.' }
    }
    if (count >= limit) {
      return {
        error: `Paket ${planTier(store)} dibatasi ${limit} kasir. Upgrade ke PRO untuk menambah kasir.`,
      }
    }
  }

  const { error } = await supabase
    .from('cashiers')
    .insert({ store_id: store.id, name, token: generateCashierToken() })

  if (error) return { error: 'Gagal menambahkan kasir' }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function deleteCashier(formData) {
  const { cashier, error: ownErr } = await requireCashierOwnership(formData.get('cashierId'))
  if (ownErr) return { error: ownErr }

  const supabase = await createClient()
  const { error } = await supabase
    .from('cashiers')
    .delete()
    .eq('id', cashier.id)
    .eq('store_id', cashier.store_id)

  if (error) return { error: 'Gagal menghapus kasir' }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

/**
 * Cetak ulang token kasir. Dibutuhkan karena token bisa bocor (dulu ikut
 * ter-render di halaman struk publik, temuan A4) dan sampai sekarang tidak ada
 * cara mencabutnya selain menghapus kasirnya.
 * Sekaligus me-reset device binding supaya kasir bisa pindah perangkat.
 */
export async function rotateCashierToken(formData) {
  const { cashier, error: ownErr } = await requireCashierOwnership(formData.get('cashierId'))
  if (ownErr) return { error: ownErr }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cashiers')
    .update({ token: generateCashierToken(), device_id: null })
    .eq('id', cashier.id)
    .eq('store_id', cashier.store_id)
    .select('token')
    .single()

  if (error) return { error: 'Gagal membuat token baru' }

  revalidatePath('/dashboard/settings')
  return { success: true, token: data.token }
}
