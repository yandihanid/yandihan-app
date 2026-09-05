/**
 * Opsi cookie sesi, dipakai bersama oleh browser client, server client, dan proxy.
 * Ketiganya HARUS memakai nilai yang sama, kalau tidak refresh token bisa
 * ditulis ke cookie dengan atribut berbeda dan sesi jadi tidak konsisten.
 *
 * Default @supabase/ssr adalah maxAge 400 hari tanpa `secure` — terlalu longgar
 * untuk cookie yang isinya JWT.
 *
 * CATATAN `httpOnly`: sengaja TIDAK di-set. Supabase Realtime di
 * app/dashboard/RealtimeTransactions.js dan app/c/[token]/WaitingList.js
 * memakai browser client, yang harus bisa membaca JWT dari JavaScript.
 * Memasang httpOnly:true akan mematikan realtime tanpa peringatan.
 * Mitigasi yang dipakai sekarang: CSP di next.config.mjs + maxAge pendek.
 * Untuk httpOnly penuh dibutuhkan route broker token terpisah.
 */
export const SUPABASE_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 7, // 7 hari (default library: 400 hari)
}
