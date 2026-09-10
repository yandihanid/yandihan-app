'use server'

// KEAMANAN (temuan A6): `addCashier` sudah memanggil getUser(), tapi lookup
// tokonya `.eq('id', storeId).single()` TANPA `.eq('user_id', user.id)`.
// Akibatnya pemilik toko A bisa mencetak token kasir di dalam toko orang lain
// hanya dengan menukar `storeId` di payload. Sekarang lewat lib/dal.js.

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'node:crypto'
import { requireStoreOwnership, requireCashierOwnership, requireUser } from '@/lib/dal'
import { normalizePhone } from '@/lib/format'
import { maxCashiers, planTier } from '@/lib/plan'

/**
 * Simpan nama toko — buat kalau belum ada, ubah kalau sudah.
 *
 * Kenapa jadi server action: SettingsForm.js dulu menulis tabel `stores`
 * langsung dari browser lewat supabase client, lalu **membuang hasilnya**:
 *
 *     await supabase.from('stores').update({ name }).eq('id', store.id)
 *     setLoading(false); router.refresh()
 *
 * Tanpa memeriksa `error`, tolakan RLS terlihat persis sama dengan berhasil —
 * spinner berhenti, halaman refresh, nama lama muncul kembali, dan tidak ada
 * penjelasan apa pun (temuan L2). Ditambah: `.eq('id', store.id)` tanpa filter
 * `user_id` menyerahkan seluruh perlindungan ke RLS. Di sini kepemilikan
 * diperiksa lewat DAL sebelum menulis, seperti action lain di file ini.
 *
 * `storeId` kosong berarti "buat toko baru", jadi ia sengaja tidak lewat
 * requireStoreOwnership() — toko yang belum ada tidak punya pemilik untuk
 * dicocokkan. user_id diambil dari sesi, bukan dari formData, supaya tidak ada
 * jalur membuat toko atas nama orang lain.
 */
export async function updateStore(formData) {
  const name = String(formData.get('name') || '').trim()
  const address = String(formData.get('address') || '').trim()
  const rawPhone = String(formData.get('phone') || '').trim()
  const phone = rawPhone ? normalizePhone(rawPhone) : null
  const storeId = formData.get('storeId')

  if (!name) return { error: 'Nama toko wajib diisi' }
  if (name.length > 80) return { error: 'Nama toko terlalu panjang (maks 80 karakter)' }
  if (address.length > 200) return { error: 'Alamat toko terlalu panjang (maks 200 karakter)' }
  if (rawPhone.length > 20) return { error: 'Nomor telepon terlalu panjang (maks 20 karakter)' }
  if (rawPhone && !phone) return { error: 'Nomor telepon tidak valid' }

  const profile = { name, address: address || null, phone }
  const supabase = await createClient()

  if (storeId) {
    const { store, error: ownErr } = await requireStoreOwnership(storeId)
    if (ownErr) return { error: ownErr }

    // .select('id') + maybeSingle(): UPDATE yang tidak mengenai satu baris pun
    // dijawab sukses oleh PostgREST. Tanpa ini, tulisan yang ditolak RLS
    // terbaca sebagai tersimpan.
    const { data, error } = await supabase
      .from('stores')
      .update(profile)
      .eq('id', store.id)
      .eq('user_id', store.user_id)
      .select('id')
      .maybeSingle()

    if (error) return { error: 'Gagal menyimpan profil toko' }
    if (!data) return { error: 'Perubahan tidak tersimpan. Coba muat ulang halaman.' }

    revalidatePath('/dashboard/settings')
    return { success: true }
  }

  const { user, error: authErr } = await requireUser()
  if (authErr) return { error: authErr }

  const { error } = await supabase.from('stores').insert({
    ...profile,
    user_id: user.id,
  })

  if (error) return { error: 'Gagal membuat toko' }

  // Checklist onboarding di /dashboard ikut berubah begitu toko pertama ada,
  // jadi dua path yang perlu di-revalidate, bukan satu.
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

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
