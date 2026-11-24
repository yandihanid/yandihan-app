'use server'

// KEAMANAN (temuan A6): `addCashier` sudah memanggil getUser(), tapi lookup
// tokonya `.eq('id', storeId).single()` TANPA `.eq('user_id', user.id)`.
// Akibatnya pemilik toko A bisa mencetak token kasir di dalam toko orang lain
// hanya dengan menukar `storeId` di payload. Sekarang lewat lib/dal.js.

import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'node:crypto'
import { requireStoreOwnership, requireCashierOwnership, requireUser } from '@/lib/dal'
import { normalizePhone } from '@/lib/format'
import { maxCashiers, planTier } from '@/lib/plan'
import { hashPassword } from '@/lib/password'
import { normalizeUsername, validatePassword, validateUsername } from '@/lib/cashierAccount'
import { deleteCashierSessionsForStore } from '@/lib/cashierAuth'
import { auditLog } from '@/lib/audit'
import { parseLogoInput, parseReviewNote, parseReviewUrl } from '@/lib/storeBrand'
import { normalizeTheme } from '@/lib/storeTheme'
import { normalizeReceiptPrinter } from '@/lib/receiptPrinter'

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

    // Toko lama yang dibuat sebelum migrasi 0012 mungkin belum punya token
    // link. Pastikan ada saat profil disimpan, supaya halaman Pengaturan tidak
    // pernah menampilkan link kosong.
    const patch = store.cashier_token
      ? profile
      : { ...profile, cashier_token: generateCashierToken() }

    // .select('id') + maybeSingle(): UPDATE yang tidak mengenai satu baris pun
    // dijawab sukses oleh PostgREST. Tanpa ini, tulisan yang ditolak RLS
    // terbaca sebagai tersimpan.
    const { data, error } = await supabase
      .from('stores')
      .update(patch)
      .eq('id', store.id)
      .eq('user_id', store.user_id)
      .select('id')
      .maybeSingle()

    if (error) return { error: 'Gagal menyimpan profil toko' }
    if (!data) return { error: 'Perubahan tidak tersimpan. Coba muat ulang halaman.' }

    await auditLog({
      storeId: store.id,
      userId: store.user_id,
      action: 'update_store',
      targetType: 'store',
      targetId: store.id,
      details: { name, address: address || null, phone: phone || null },
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  }

  const { user, error: authErr } = await requireUser()
  if (authErr) return { error: authErr }

  const { error } = await supabase.from('stores').insert({
    ...profile,
    user_id: user.id,
    cashier_token: generateCashierToken(),
  })

  if (error) return { error: 'Gagal membuat toko' }

  await auditLog({
    storeId: null, // store ID belum diketahui saat insert; user_id sebagai penanda
    userId: user.id,
    action: 'create_store',
    targetType: 'store',
    targetId: null,
    details: { name },
  })

  // Checklist onboarding di /dashboard ikut berubah begitu toko pertama ada,
  // jadi dua path yang perlu di-revalidate, bukan satu.
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

// Token link toko dibuat di sini, bukan diserahkan ke DEFAULT kolom DB.
// 24 byte = 192 bit, base64url supaya aman dipakai sebagai segmen URL /c/<token>.
function generateCashierToken() {
  return randomBytes(24).toString('base64url')
}

/**
 * Simpan logo usaha.
 *
 * Logo dikirim dari browser sebagai data URL (hasil kompres, supaya file
 * asli 3-8 MB tidak ikut masuk) atau sebagai URL http/https kalau pemilik
 * sudah punya file yang di-host di luar. String kosong berarti "hapus logo",
 * jadi kolomnya jadi NULL dan bukan '' yang nanti terbaca sebagai "logo ada".
 *
 * Warnanya sama seperti updateStore: UPDATE yang tidak mengenai satu baris
 * pun dijawab sukses oleh PostgREST, jadi baris yang cocok harus dibuktikan
 * dengan .select('id') + maybeSingle().
 */
export async function updateStoreLogo(formData) {
  const { store, error: ownErr } = await requireStoreOwnership(formData.get('storeId'))
  if (ownErr) return { error: ownErr }

  const { logoUrl, error: logoErr } = parseLogoInput(formData.get('logoUrl'))
  if (logoErr) return { error: logoErr }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .update({ logo_url: logoUrl })
    .eq('id', store.id)
    .eq('user_id', store.user_id)
    .select('id')
    .maybeSingle()

  if (error) return { error: 'Gagal menyimpan logo' }
  if (!data) return { error: 'Logo tidak tersimpan. Coba muat ulang halaman.' }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

/**
 * Simpan setelan rating Google Maps.
 *
 * `reviewUrl` kosong berarti fitur dimatikan: halaman status pesanan tidak
 * menampilkan pop up rating sama sekali. Karena itu link kosong bukan error --
 * pemilik boleh menyimpan catatan saja lebih dulu atau mematikan fitur kapan
 * saja tanpa perlu menghapus catektaan.
 */
export async function updateStoreReview(formData) {
  const { store, error: ownErr } = await requireStoreOwnership(formData.get('storeId'))
  if (ownErr) return { error: ownErr }

  const { url, error: urlErr } = parseReviewUrl(formData.get('reviewUrl'))
  if (urlErr) return { error: urlErr }

  const { note, error: noteErr } = parseReviewNote(formData.get('reviewNote'))
  if (noteErr) return { error: noteErr }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .update({ gmaps_review_url: url, gmaps_review_note: note })
    .eq('id', store.id)
    .eq('user_id', store.user_id)
    .select('id')
    .maybeSingle()

  if (error) return { error: 'Gagal menyimpan pengaturan rating' }
  if (!data) return { error: 'Pengaturan tidak tersimpan. Coba muat ulang halaman.' }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

/**
 * Simpan warna dasar toko.
 *
 * Warna ini dipakai di dashboard, link kasir, dan halaman pesan meja. Nilai
 * yang tidak dikenal dinormalisasi ke tema bawaan (biru) supaya halaman
 * tidak pernah kehilangan warna.
 */
export async function updateStoreTheme(formData) {
  const { store, error: ownErr } = await requireStoreOwnership(formData.get('storeId'))
  if (ownErr) return { error: ownErr }

  const theme = normalizeTheme(formData.get('themeColor'))

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .update({ theme_color: theme })
    .eq('id', store.id)
    .eq('user_id', store.user_id)
    .select('id')
    .maybeSingle()

  if (error) return { error: 'Gagal menyimpan warna toko' }
  if (!data) return { error: 'Warna tidak tersimpan. Coba muat ulang halaman.' }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Simpan lebar kertas struk (58 mm atau 80 mm).
 *
 * Nilai ini menentukan ukuran @page saat struk dicetak, supaya struk tidak
 * perlu diperkecil lagi di dialog cetak browser.
 */
export async function updateStorePrinter(formData) {
  const { store, error: ownErr } = await requireStoreOwnership(formData.get('storeId'))
  if (ownErr) return { error: ownErr }

  const printer = normalizeReceiptPrinter(formData.get('receiptPrinter'))

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .update({ receipt_printer: printer })
    .eq('id', store.id)
    .eq('user_id', store.user_id)
    .select('id')
    .maybeSingle()

  if (error) return { error: 'Gagal menyimpan ukuran kertas struk' }
  if (!data) return { error: 'Pengaturan tidak tersimpan. Coba muat ulang halaman.' }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

function isDuplicateUsername(error) {
  return error?.code === '23505' || /duplicate key/i.test(error?.message || '')
}

export async function addCashier(formData) {
  const name = String(formData.get('name') || '').trim()
  const username = normalizeUsername(formData.get('username'))
  const password = String(formData.get('password') || '')

  const { store, error: ownErr } = await requireStoreOwnership(formData.get('storeId'))
  if (ownErr) return { error: ownErr }
  if (!name) return { error: 'Nama kasir wajib diisi' }
  if (name.length > 80) return { error: 'Nama kasir terlalu panjang (maks 80 karakter)' }

  const usernameError = validateUsername(username)
  if (usernameError) return { error: usernameError }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError }

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

  const { error } = await supabase.from('cashiers').insert({
    store_id: store.id,
    name,
    username,
    password_hash: hashPassword(password),
  })

  if (isDuplicateUsername(error)) {
    return { error: `Username "${username}" sudah dipakai kasir lain di toko ini.` }
  }
  if (error) return { error: 'Gagal menambahkan kasir' }

  await auditLog({
    storeId: store.id,
    userId: store.user_id,
    action: 'add_cashier',
    targetType: 'cashier',
    targetId: null,
    details: { name, username },
  })

  revalidatePath('/dashboard/settings')
  return { success: true }
}

/**
 * Ubah nama/username dan (opsional) atur ulang kata sandi.
 *
 * Kata sandi kosong berarti "jangan diubah". Ini yang dipakai pemilik untuk
 * mereset akun kasir yang lupa kata sandi tanpa menghapus riwayatnya.
 */
export async function updateCashierAccount(formData) {
  const cashierId = formData.get('cashierId')
  const name = String(formData.get('name') || '').trim()
  const username = normalizeUsername(formData.get('username'))
  const password = String(formData.get('password') || '')

  const { cashier, error: ownErr } = await requireCashierOwnership(cashierId)
  if (ownErr) return { error: ownErr }
  if (!name) return { error: 'Nama kasir wajib diisi' }
  if (name.length > 80) return { error: 'Nama kasir terlalu panjang (maks 80 karakter)' }

  const usernameError = validateUsername(username)
  if (usernameError) return { error: usernameError }

  const passwordError = validatePassword(password, { required: false })
  if (passwordError) return { error: passwordError }

  const patch = { name, username }
  if (password) patch.password_hash = hashPassword(password)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cashiers')
    .update(patch)
    .eq('id', cashier.id)
    .eq('store_id', cashier.store_id)
    .select('id')
    .maybeSingle()

  if (isDuplicateUsername(error)) {
    return { error: `Username "${username}" sudah dipakai kasir lain di toko ini.` }
  }
  if (error) return { error: 'Gagal menyimpan akun kasir' }
  if (!data) return { error: 'Perubahan tidak tersimpan. Coba muat ulang halaman.' }

  // Ambil store untuk user_id pemilik (untuk audit log)
  const { data: store } = await supabase
    .from('stores')
    .select('id, user_id')
    .eq('id', cashier.store_id)
    .maybeSingle()

  await auditLog({
    storeId: cashier.store_id,
    userId: store?.user_id || null,
    action: 'update_cashier_account',
    targetType: 'cashier',
    targetId: cashier.id,
    details: { name, username, passwordChanged: Boolean(password) },
  })

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

  // Ambil store untuk mendapatkan user_id pemilik (untuk audit log)
  const { data: store } = await supabase
    .from('stores')
    .select('id, user_id')
    .eq('id', cashier.store_id)
    .maybeSingle()

  await auditLog({
    storeId: cashier.store_id,
    userId: store?.user_id || null,
    action: 'delete_cashier',
    targetType: 'cashier',
    targetId: cashier.id,
    details: { name: cashier.name, username: cashier.username },
  })

  revalidatePath('/dashboard/settings')
  return { success: true }
}

/**
 * Ganti token link toko. Link lama langsung mati dan SEMUA sesi kasir toko ini
 * dicabut, karena link yang bocor biasanya berarti perangkat yang memegangnya
 * juga tidak lagi tepercaya. Akun kasir dan riwayat transaksi tidak berubah.
 */
export async function rotateStoreCashierToken(storeId) {
  const { store, error: ownErr } = await requireStoreOwnership(storeId)
  if (ownErr) return { error: ownErr }

  const token = generateCashierToken()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .update({ cashier_token: token })
    .eq('id', store.id)
    .eq('user_id', store.user_id)
    .select('cashier_token')
    .maybeSingle()

  if (error) return { error: 'Gagal membuat link baru' }
  if (!data) return { error: 'Link tidak tersimpan. Coba muat ulang halaman.' }

  // cashier_sessions tidak punya policy untuk authenticated, jadi pembersihan
  // sesi lewat service role.
  const service = createServiceClient()
  await deleteCashierSessionsForStore(service, store.id)

  await auditLog({
    storeId: store.id,
    userId: store.user_id,
    action: 'rotate_cashier_token',
    targetType: 'store',
    targetId: store.id,
    details: { reason: 'owner_rotated' },
  })

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { success: true, token: data.cashier_token }
}
