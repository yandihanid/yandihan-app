import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireStoreOwnership } from '@/lib/dal'

const NO_STORE = { 'cache-control': 'private, no-store' }

export async function GET(req) {
  const url = new URL(req.url)
  const storeId = url.searchParams.get('storeId')
  const { store, error: ownErr } = await requireStoreOwnership(storeId)
  if (ownErr) return NextResponse.json({ error: ownErr }, { status: 403, headers: NO_STORE })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_tables')
    .select('id, store_id, table_number, label, note, created_at')
    .eq('store_id', store.id)
    .order('table_number', { ascending: true })

  if (error) return NextResponse.json({ error: 'Gagal memuat meja' }, { status: 500, headers: NO_STORE })
  return NextResponse.json(data || [], { headers: NO_STORE })
}

export async function POST(req) {
  let body
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400, headers: NO_STORE })
  }
  const { storeId, tableNumber, label, note } = body || {}
  const { store, error: ownErr } = await requireStoreOwnership(storeId)
  if (ownErr) return NextResponse.json({ error: ownErr }, { status: 403, headers: NO_STORE })

  const n = Number.parseInt(tableNumber, 10)
  if (!Number.isFinite(n) || n < 1) {
    return NextResponse.json({ error: 'Nomor meja tidak valid' }, { status: 400, headers: NO_STORE })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_tables')
    .insert({ store_id: store.id, table_number: n, label: label || null, note: note || null })
    .select('id, store_id, table_number, label, note, created_at')
    .single()

  if (error) return NextResponse.json({ error: 'Gagal menyimpan meja' }, { status: 500, headers: NO_STORE })
  return NextResponse.json(data, { headers: NO_STORE })
}

export async function DELETE(req) {
  let body
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400, headers: NO_STORE })
  }
  const { storeId, id } = body || {}
  const { store, error: ownErr } = await requireStoreOwnership(storeId)
  if (ownErr) return NextResponse.json({ error: ownErr }, { status: 403, headers: NO_STORE })

  const supabase = await createClient()
  const { error } = await supabase
    .from('store_tables')
    .delete()
    .eq('id', id)
    .eq('store_id', store.id)

  if (error) return NextResponse.json({ error: 'Gagal menghapus meja' }, { status: 500, headers: NO_STORE })
  return NextResponse.json({ success: true }, { headers: NO_STORE })
}
