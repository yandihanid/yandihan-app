import { NextResponse } from 'next/server'
import { authorizeCashier, readCashierToken, tokenBucket } from '@/lib/cashierAuth'
import { normalizeQueueStatus } from '@/lib/queue'
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
const CASHIER_COLUMNS = 'id, store_id, device_id, stores!inner(waiting_list_enabled)'

async function authorize(req, { limit, windowSeconds }) {
  const token = readCashierToken(req)
  if (!token) {
    return { response: NextResponse.json({ error: 'Token kasir diperlukan' }, { status: 400, headers: NO_STORE }) }
  }

  const rate = await checkRateLimit(tokenBucket('cashier:waiting', token), { limit, windowSeconds })
  if (!rate.allowed) return { response: tooManyRequests(rate.retryAfter) }

  const auth = await authorizeCashier(req, CASHIER_COLUMNS)
  if (auth.error) {
    return {
      response: NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: NO_STORE }
      ),
    }
  }
  const { cashier, supabase } = auth

  // Fitur dimatikan pemilik toko: tiap handler memutuskan sendiri jawabannya.
  if (!cashier.stores?.waiting_list_enabled) return { disabled: true }

  return { cashier, supabase }
}

export async function GET(req) {
  const { response, disabled, cashier, supabase } = await authorize(req, { limit: 90, windowSeconds: 60 })
  if (response) return response
  if (disabled) return NextResponse.json({ tickets: [], enabled: false }, { headers: NO_STORE })

  const status = normalizeQueueStatus(new URL(req.url).searchParams.get('status') || 'pending')
  if (!status) {
    return NextResponse.json({ error: 'Status antrean tidak valid' }, { status: 400, headers: NO_STORE })
  }

  const { day } = wibDayRange()

  const { data, error } = await supabase
    .from('transactions')
    .select('id, queue_number, buyer_name, customer_name, product_name, amount, created_at')
    .eq('store_id', cashier.store_id)
    .eq('queue_date', day)
    .eq('status', status)
    .order('queue_number', { ascending: true })
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

  const { day } = wibDayRange()

  // store_id, hari WIB, dan status asal ikut difilter: token toko A tidak bisa
  // menyelesaikan tiket toko B atau mengubah riwayat yang sudah selesai.
  const { data, error } = await supabase
    .from('transactions')
    .update({ status: 'done' })
    .eq('id', id)
    .eq('store_id', cashier.store_id)
    .eq('queue_date', day)
    .eq('status', 'pending')
    .select('id, queue_number')
    .maybeSingle()

  if (error) {
    console.error('Gagal menyelesaikan tiket', { code: error.code })
    return NextResponse.json({ error: 'Gagal memperbarui tiket' }, { status: 500, headers: NO_STORE })
  }

  if (!data) {
    return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404, headers: NO_STORE })
  }

  return NextResponse.json(
    { ok: true, id: data.id, queue_number: data.queue_number },
    { headers: NO_STORE }
  )
}
