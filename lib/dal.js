// Data Access Layer.
//
// Kenapa file ini ada: sebelumnya setiap route/action harus ingat sendiri
// memanggil getUser() dan memfilter kepemilikan. Beberapa lupa
// (app/dashboard/produk/actions.js tidak punya cek sama sekali) dan satu
// setengah-lupa (addCashier punya getUser() tapi lookup toko tanpa filter
// user_id). Di sini pemeriksaannya jadi satu tempat.
//
// PENTING: cek auth tidak boleh hanya ada di app/dashboard/layout.js.
// Karena Partial Rendering, layout tidak ikut re-render saat navigasi antar
// route di bawahnya, jadi pemeriksaan harus dekat sumber data — yaitu di sini
// (node_modules/next/dist/docs/01-app/02-guides/authentication.md:1348-1356).
//
// proxy.js hanya gate optimistik dan tidak menggantikan file ini.
import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/**
 * User terverifikasi (getUser() menghubungi Auth server) atau null.
 * cache() membuat satu request hanya sekali per render pass, jadi aman
 * dipanggil berulang dari beberapa komponen/action.
 */
export const getCurrentUser = cache(async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) return null
  return user ?? null
})

/** Untuk page/layout: tidak login -> redirect. Selalu mengembalikan user. */
export async function verifySession(returnTo) {
  const user = await getCurrentUser()
  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login')
  }
  return user
}

/**
 * Untuk server action / route handler: jangan redirect, tapi kembalikan
 * bentuk yang bisa diteruskan sebagai { error } ke UI.
 */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) return { user: null, error: 'Sesi berakhir. Silakan masuk kembali.' }
  return { user, error: null }
}

const STORE_COLUMNS =
  'id, name, address, phone, user_id, unique_code, subscription_tier, subscription_end_date, receipt_required, require_customer_name, waiting_list_enabled, pelanggan_enabled, visit_threshold, discount_percent, created_at'

/**
 * Toko milik user yang sedang login. maybeSingle() + order+limit, bukan
 * single(): user dengan >1 toko dulu kena PGRST116 dan terlempar bolak-balik
 * ke /dashboard/settings (temuan C11).
 * Mengembalikan null kalau belum punya toko — itu keadaan normal untuk user baru.
 */
export const getMyStore = cache(async function getMyStore() {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('stores')
    .select(STORE_COLUMNS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data ?? null
})

/**
 * Semua toko milik user (untuk pemilih cabang nanti). Tetap satu tempat
 * supaya filter user_id tidak pernah lupa dipasang.
 */
export const getMyStores = cache(async function getMyStores() {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('stores')
    .select(STORE_COLUMNS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return data ?? []
})

/**
 * Pastikan storeId kiriman client benar-benar milik user.
 * Filter dilakukan di query (.eq('user_id')), bukan dibandingkan setelah
 * baris diambil — jadi tidak ada jalur di mana row toko orang lain sempat
 * terbaca.
 */
export async function requireStoreOwnership(storeId) {
  const { user, error } = await requireUser()
  if (error) return { store: null, user: null, error }
  if (!storeId) return { store: null, user, error: 'ID toko tidak valid' }

  const supabase = await createClient()
  const { data: store } = await supabase
    .from('stores')
    .select(STORE_COLUMNS)
    .eq('id', storeId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!store) return { store: null, user, error: 'Toko tidak ditemukan atau bukan milik Anda' }
  return { store, user, error: null }
}

/**
 * Pastikan produk milik toko user. Pola stores!inner(user_id) diambil dari
 * deleteCashier yang sudah benar (app/dashboard/settings/actions.js:51-59).
 */
export async function requireProductOwnership(productId) {
  const { user, error } = await requireUser()
  if (error) return { product: null, user: null, error }
  if (!productId) return { product: null, user, error: 'ID produk tidak valid' }

  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('id, store_id, name, price, stock, is_sub_product, stores!inner(user_id)')
    .eq('id', productId)
    .eq('stores.user_id', user.id)
    .maybeSingle()

  if (!product) return { product: null, user, error: 'Produk tidak ditemukan atau bukan milik Anda' }
  return { product, user, error: null }
}

/** Pastikan kasir milik toko user. */
export async function requireCashierOwnership(cashierId) {
  const { user, error } = await requireUser()
  if (error) return { cashier: null, user: null, error }
  if (!cashierId) return { cashier: null, user, error: 'ID kasir tidak valid' }

  const supabase = await createClient()
  const { data: cashier } = await supabase
    .from('cashiers')
    .select('id, store_id, name, stores!inner(user_id)')
    .eq('id', cashierId)
    .eq('stores.user_id', user.id)
    .maybeSingle()

  if (!cashier) return { cashier: null, user, error: 'Kasir tidak ditemukan atau bukan milik Anda' }
  return { cashier, user, error: null }
}

/**
 * Status onboarding satu toko: sudah ada produk? kasir? transaksi? (temuan K5)
 *
 * head: true + count: 'exact' meminta PostgREST mengirim jumlah baris di header
 * Content-Range tanpa satu pun baris di body — yang dibutuhkan checklist cuma
 * "ada atau tidak", jadi menarik barisnya hanya membuang bandwidth. limit(1)
 * pada kasir diperlukan karena token-nya memang dipakai (untuk link yang
 * dibagikan), sementara dua yang lain tidak.
 *
 * Ketiga query jalan berbarengan lewat Promise.all: ketiganya independen, dan
 * berurutan berarti tiga round-trip ke Supabase sebelum halaman bisa dirender.
 *
 * cache() supaya /dashboard dan /dashboard/pelanggan yang memanggilnya di
 * request yang sama tidak menghitung dua kali.
 */
export const getOnboardingState = cache(async function getOnboardingState(storeId) {
  if (!storeId) {
    return { productCount: 0, cashierCount: 0, transactionCount: 0, cashierToken: null }
  }

  const supabase = await createClient()
  const [products, cashiers, transactions] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
    supabase
      .from('cashiers')
      .select('token', { count: 'exact' })
      .eq('store_id', storeId)
      .order('created_at', { ascending: true })
      .limit(1),
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId),
  ])

  return {
    productCount: products.count ?? 0,
    cashierCount: cashiers.count ?? 0,
    transactionCount: transactions.count ?? 0,
    cashierToken: cashiers.data?.[0]?.token ?? null,
  }
})
