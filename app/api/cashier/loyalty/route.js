import { NextResponse } from 'next/server'
import { authorizeCashier, readCashierToken, tokenBucket } from '@/lib/cashierAuth'
import { checkRateLimit, tooManyRequests } from '@/lib/rateLimit'
import { normalizePhone } from '@/lib/format'
import { loyaltyState } from '@/lib/loyalty'

// Pencarian pelanggan HANYA-BACA untuk layar kasir.
//
// Kenapa route baru, bukan POST /api/pelanggan yang sudah ada: endpoint itu
// MENAIKKAN visit_count setiap kali dipanggil. Dipakai untuk sekadar melihat
// apakah seorang pembeli berhak diskon, itu artinya kunjungan bertambah tanpa
// ada transaksi -- pelanggan bisa mencapai threshold hanya dengan mengetik
// nomornya berulang kali. Route ini tidak menulis apa pun.
//
// Kasir perlu jawabannya SEBELUM menagih, karena total yang ditampilkan harus
// sama dengan total yang ditagih (temuan B4). Nilai dari sini tetap tidak
// dipercaya saat submit: submitTransaction menghitung ulang diskonnya sendiri.

const NO_STORE = { 'cache-control': 'private, no-store' }
const CASHIER_COLUMNS =
  'id, store_id, device_id, stores!inner(subscription_tier, subscription_end_date, ' +
  'pelanggan_enabled, visit_threshold, discount_percent)'

export async function GET(req) {
  const token = readCashierToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Token kasir diperlukan' }, { status: 400, headers: NO_STORE })
  }

  const rate = await checkRateLimit(tokenBucket('cashier:loyalty', token), {
    limit: 120,
    windowSeconds: 60,
  })
  if (!rate.allowed) return tooManyRequests(rate.retryAfter)

  const phone = normalizePhone(new URL(req.url).searchParams.get('phone'))
  if (!phone) {
    return NextResponse.json({ error: 'Nomor tidak valid' }, { status: 400, headers: NO_STORE })
  }

  const auth = await authorizeCashier(req, CASHIER_COLUMNS)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE })
  }
  const { cashier, supabase } = auth

  const store = cashier.stores || {}
  if (!loyaltyState(store, null).enabled) {
    return NextResponse.json({ enabled: false }, { headers: NO_STORE })
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, name, phone, visit_count, total_spent')
    .eq('store_id', cashier.store_id)
    .eq('phone', phone)
    .maybeSingle()

  if (error) {
    console.error('Gagal mencari pelanggan', { code: error.code })
    return NextResponse.json({ error: 'Gagal mencari pelanggan' }, { status: 500, headers: NO_STORE })
  }

  const state = loyaltyState(store, customer)

  return NextResponse.json(
    {
      enabled: true,
      phone,
      name: customer?.name ?? null,
      known: state.known,
      visitCount: state.visitCount,
      threshold: state.threshold,
      discountPercent: state.discountPercent,
      eligible: state.eligible,
      visitsToGo: state.visitsToGo,
    },
    { headers: NO_STORE }
  )
}
