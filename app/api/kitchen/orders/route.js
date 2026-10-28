import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { requireStoreOwnership } from '@/lib/dal'
import { CASHIER_TOKEN_HEADER, authorizeCashier } from '@/lib/cashierAuth'
import { wibDayRange } from '@/lib/time'

// Data untuk Kitchen Display System (KDS).
//
// Dulu komponen KDS membaca tabel `transactions` langsung dari browser dengan
// anon key. Itu tidak bekerja untuk layar kasir: halaman /c/[token] tidak punya
// sesi Supabase, dan RLS menolak semua baris tanpa error. Sekarang KDS memanggil
// route ini, dan identitas ditentukan di server: sesi pemilik toko ATAU token
// kasir yang cocok dengan tokonya.

const NO_STORE = { 'cache-control': 'private, no-store' }

const TICKET_FIELDS = `
  id,
  store_id,
  queue_number,
  table_number,
  buyer_name,
  customer_name,
  product_name,
  amount,
  created_at,
  status,
  kitchen_status,
  payment_method
`

async function resolveStoreAccess(req, storeId) {
  if (!storeId) return { error: 'storeId diperlukan', status: 400 }

  if (req.headers.get(CASHIER_TOKEN_HEADER)) {
    const auth = await authorizeCashier(req, 'id, store_id')
    if (auth.error) return { error: auth.error, status: auth.status || 401 }
    if (auth.cashier.store_id !== storeId) {
      return { error: 'Akses ditolak', status: 403 }
    }
    return { storeId: auth.cashier.store_id }
  }

  const { store, error } = await requireStoreOwnership(storeId)
  if (error) return { error, status: 403 }
  return { storeId: store.id }
}

export async function GET(req) {
  const url = new URL(req.url)
  const access = await resolveStoreAccess(req, url.searchParams.get('storeId'))
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE })
  }

  const supabase = createServiceClient()
  const { start, end } = wibDayRange()

  const { data, error } = await supabase
    .from('transactions')
    .select(TICKET_FIELDS)
    .eq('store_id', access.storeId)
    .in('kitchen_status', ['pending', 'done'])
    .gte('created_at', start)
    .lt('created_at', end)
    .order('created_at', { ascending: true })
    .limit(150)

  if (error) {
    console.error('Gagal memuat pesanan dapur', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Gagal memuat pesanan' }, { status: 500, headers: NO_STORE })
  }

  return NextResponse.json({ tickets: data || [] }, { headers: NO_STORE })
}

export async function PATCH(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400, headers: NO_STORE })
  }

  const storeId = body?.storeId
  const id = typeof body?.id === 'string' ? body.id.trim() : ''

  if (!id) {
    return NextResponse.json({ error: 'id pesanan diperlukan' }, { status: 400, headers: NO_STORE })
  }

  const access = await resolveStoreAccess(req, storeId)
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('transactions')
    .update({ kitchen_status: 'done' })
    .eq('id', id)
    .eq('store_id', access.storeId)
    .select('id, queue_number')
    .maybeSingle()

  if (error) {
    console.error('Gagal menyelesaikan pesanan dapur', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Gagal memperbarui pesanan' }, { status: 500, headers: NO_STORE })
  }

  if (!data) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404, headers: NO_STORE })
  }

  return NextResponse.json({ ok: true, id: data.id, queueNumber: data.queue_number }, { headers: NO_STORE })
}
