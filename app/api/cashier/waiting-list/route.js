import { NextResponse } from 'next/server'
import { readCashierToken, resolveCashier, tokenBucket } from '@/lib/cashierAuth'
import { checkRateLimit, tooManyRequests } from '@/lib/rateLimit'
import { wibDayRange } from '@/lib/time'

// Kenapa route ini ada.
//
// app/c/[token]/WaitingList.js dulu membaca DAN menulis tabel transactions
// langsung dari browser dengan anon key, padahal halaman kasir tidak punya
// sesi Supabase sama sekali. Itu hanya "jalan" karena RLS belum aktif. Begitu
// 0002_rls_policies.sql dijalankan, query itu akan mengembalikan nol baris
// tanpa error dan waiting list mati diam-diam.
//
// Sekarang: token kasir diverifikasi di server, store_id diturunkan dari hasil
// lookup token (bukan dari input client), dan penulisan status dibatasi ke
// toko milik token itu.
//
// Filter hari ini juga memperbaiki temuan C8: dulu semua transaksi 'pending'
// ditarik tanpa filter tanggal, jadi waiting list menumpuk seluruh riwayat
// penjualan selamanya.

const NO_STORE = { 'cache-control': 'private, no-store' }
const CASHIER_COLUMNS = 'id, store_id, stores!inner(waiting_list_enabled)'

async function authorize(req, { limit, windowSeconds }) {
  const token = readCashierToken(req)
  if (!token) {
    return { response: NextResponse.json({ error: 'Token kasir diperlukan' }, { status: 400, headers: NO_STORE }) }
  }

  const rate = await checkRateLimit(tokenBucket('cashier:waiting', token), { limit, windowSeconds })
  if (!rate.allowed) return { response: tooManyRequests(rate.retryAfter) }

  const { cashier, supabase } = await resolveCashier(token, CASHIER_COLUMNS)
  if (!cashier) {
    return { response: NextResponse.json({ error: 'Link kasir tidak valid' }, { status: 404, headers: NO_STORE }) }
  }

  // Fitur dimatikan pemilik toko: tiap handler memutuskan sendiri jawabannya.
  if (!cashier.stores?.waiting_list_enabled) return { disabled: true }

  return { cashier, supabase }
}

export async function GET(req) {
  const { response, disabled, cashier, supabase } = await authorize(req, { limit: 90, windowSeconds: 60 })
  if (response) return response
  if (disabled) return NextResponse.json({ tickets: [], enabled: false }, { headers: NO_STORE })

  const { start, end } = wibDayRange()

  const { data, error } = await supabase
    .from('transactions')
    .select('id, buyer_name, customer_name, product_name, amount, created_at')
    .eq('store_id', cashier.store_id)
    .eq('status', 'pending')
    .gte('created_at', start)
    .lt('created_at', end)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    console.error('Gagal memuat waiting list', { code: error.code })
    return NextResponse.json({ error: 'Gagal memuat daftar' }, { status: 500, headers: NO_STORE })
  }

  return NextResponse.json({ tickets: data ?? [], enabled: true }, { headers: NO_STORE })
}

export async function PATCH(req) {
  const { response, disabled, cashier, supabase } = await authorize(req, { limit: 60, windowSeconds: 60 })
  if (response) return response
  if (disabled) {
    return NextResponse.json({ error: 'Waiting list tidak aktif' }, { status: 403, headers: NO_STORE })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400, headers: NO_STORE })
  }

  const id = typeof body?.id === 'string' ? body.id.trim() : ''
  if (!id) {
    return NextResponse.json({ error: 'id transaksi diperlukan' }, { status: 400, headers: NO_STORE })
  }

  // store_id ikut difilter: token toko A tidak bisa menyelesaikan tiket toko B.
  const { data, error } = await supabase
    .from('transactions')
    .update({ status: 'done' })
    .eq('id', id)
    .eq('store_id', cashier.store_id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Gagal menyelesaikan tiket', { code: error.code })
    return NextResponse.json({ error: 'Gagal memperbarui tiket' }, { status: 500, headers: NO_STORE })
  }

  if (!data) {
    return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404, headers: NO_STORE })
  }

  return NextResponse.json({ ok: true, id: data.id }, { headers: NO_STORE })
}
