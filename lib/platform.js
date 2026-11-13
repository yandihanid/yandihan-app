import 'server-only'

/**
 * Akses khusus pengelola platform.
 *
 * Dashboard aplikasi ini multi-tenant: setiap pengguna melihat tokonya
 * sendiri. Tapi ada satu pekerjaan yang memang milik pemilik usaha --
 * mengelola pencairan pendapatan semua toko -- dan pekerjaan itu tidak bisa
 * dilakukan dari dashboard toko mana pun.
 *
 * Karena itu halaman pencairan hanya boleh dibuka pengguna yang id-nya
 * terdaftar di PLATFORM_ADMIN_USER_IDS (dipisah koma). Daftar ini dibaca
 * dari environment, jadi tidak bisa diisi dari browser dan tidak bisa
 * ditambahkan lewat antarmuka apa pun.
 */

export function platformAdminIds() {
  return String(process.env.PLATFORM_ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

/**
 * Apakah pengguna ini pengelola platform?
 *
 * Perbandingan dilakukan constant time supaya tidak bocor lewat selisih
 * waktu -- daftar ini kecil dan hanya dibaca sekali per render, tapi
 * biayanya nol untuk dilakukan.
 */
export function isPlatformAdmin(user) {
  const id = user?.id
  if (!id) return false

  const admins = platformAdminIds()
  if (!admins.length) return false

  let matched = false
  for (const adminId of admins) {
    matched = safeEqual(adminId, id) || matched
  }
  return matched
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
