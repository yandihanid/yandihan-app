import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireStoreOwnership } from '@/lib/dal'

/**
 * Satu-satunya endpoint untuk setelan boolean toko.
 *
 * Tiga perbaikan:
 *
 * 1. `receipt_required` masuk whitelist. Sebelumnya kolom itu punya route
 *    sendiri (app/api/settings/receipt-required, sekarang dihapus) yang
 *    melakukan hal yang persis sama dengan nama field berbeda —
 *    `receiptRequired` camelCase di body, `receipt_required` di DB. Dua route
 *    untuk satu jenis operasi berarti setiap perbaikan harus diingat dua kali,
 *    dan cek kepemilikan yang lebih ketat di sini tidak pernah sampai ke sana.
 *
 * 2. Cek kepemilikan lewat requireStoreOwnership() dari DAL, bukan getUser()
 *    mentah + `.eq('user_id')` yang ditulis ulang di sini.
 *
 * 3. **Memastikan ada baris yang benar-benar berubah.** Ini yang paling penting:
 *    PostgREST menjawab sukses untuk UPDATE yang tidak mengenai satu baris pun.
 *    Jadi kalau RLS menolak tulisannya, `error` tetap null dan route lama
 *    menjawab `{ success: true }` — toggle di layar berpindah, database tidak,
 *    dan pengguna baru tahu setelah refresh (temuan L3). `.select('id')` +
 *    maybeSingle() membuat baris yang cocok terbukti ada; kalau tidak ada,
 *    jawabannya 403, bukan 200.
 */
const ALLOWED_FIELDS = [
  'receipt_required',
  'require_customer_name',
  'waiting_list_enabled',
]

export async function PATCH(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  const { store, error: ownErr } = await requireStoreOwnership(body?.storeId)
  if (ownErr) {
    // Sesi habis dan "toko bukan milik Anda" adalah dua hal berbeda bagi
    // pemanggil: yang pertama perlu login ulang, yang kedua tidak akan pernah
    // berhasil diulang.
    const status = ownErr.includes('Sesi') ? 401 : 403
    return NextResponse.json({ error: ownErr }, { status })
  }

  const update = {}
  for (const field of ALLOWED_FIELDS) {
    if (typeof body[field] === 'boolean') update[field] = body[field]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Tidak ada perubahan valid' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .update(update)
    .eq('id', store.id)
    .eq('user_id', store.user_id)
    .select('id')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Pengaturan tidak tersimpan. Coba muat ulang halaman.' },
      { status: 403 }
    )
  }

  return NextResponse.json({ success: true, ...update })
}
