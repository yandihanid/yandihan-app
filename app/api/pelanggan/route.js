import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { requireStoreOwnership } from '@/lib/dal'

// GET /api/pelanggan?storeId=xxx -- daftar pelanggan untuk dashboard pemilik.
//
// POST-nya DIHAPUS di pass ini. Endpoint itu:
//   * tidak dipanggil dari mana pun (dicek dengan grep di seluruh repo)
//   * menaikkan visit_count setiap kali dipanggil, tanpa autentikasi selain
//     token kasir dan tanpa rate limit -- artinya siapa pun yang punya link
//     kasir bisa memanggilnya berulang kali sampai nomornya melewati ambang
//     dan berhak diskon selamanya
//   * menggerbangi fitur dengan `subscription_tier !== 'PRO'` mentah, jadi
//     langganan PRO yang sudah kedaluwarsa tetap lolos (temuan C9)
//
// Kunjungan sekarang dinaikkan di dalam RPC submit_transaction()
// (supabase/migrations/0003_transaction_rpc.sql) -- satu kunjungan per
// transaksi yang benar-benar tercatat, dalam transaksi DB yang sama, bukan
// satu per panggilan HTTP. Pratinjau diskon dibaca lewat
// GET /api/cashier/loyalty yang tidak menulis apa pun.
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId diperlukan' }, { status: 400 })

  const { store, error } = await requireStoreOwnership(storeId)
  if (error) return NextResponse.json({ error }, { status: 403 })

  const service = createServiceClient()
  const { data, error: dbError } = await service
    .from('customers')
    .select('id, name, phone, visit_count, total_spent, created_at')
    .eq('store_id', store.id)
    .order('visit_count', { ascending: false })

  if (dbError) {
    // Pesan error database tidak dikirim ke client.
    console.error('Gagal memuat pelanggan', { code: dbError.code })
    return NextResponse.json({ error: 'Gagal memuat data pelanggan' }, { status: 500 })
  }

  return NextResponse.json(data || [], { headers: { 'cache-control': 'private, no-store' } })
}
