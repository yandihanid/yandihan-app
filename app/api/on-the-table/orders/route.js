import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createServiceClient } from '@/utils/supabase/service'
import { createXenditInvoice } from '@/lib/xendit'
import { normalizeItems } from '@/lib/transactionValidation'
import { submitTransactionRpc } from '@/lib/transaction'

const NO_STORE = { 'cache-control': 'private, no-store' }

export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400, headers: NO_STORE })
  }

  const { storeId, tableNumber, items: rawItems } = body || {}
  if (!storeId) return NextResponse.json({ error: 'storeId diperlukan' }, { status: 400, headers: NO_STORE })

  const parsed = normalizeItems(rawItems)
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400, headers: NO_STORE })

  const supabase = createServiceClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, on_table_enabled')
    .eq('id', storeId)
    .maybeSingle()

  if (!store) return NextResponse.json({ error: 'Toko tidak ditemukan' }, { status: 404, headers: NO_STORE })
  if (!store.on_table_enabled) {
    return NextResponse.json({ error: 'Fitur On the Table belum aktif. Aktifkan add-on PRO terlebih dahulu.' }, { status: 403, headers: NO_STORE })
  }

  const productIds = parsed.items.map((i) => i.product_id)
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock')
    .eq('store_id', storeId)
    .in('id', productIds)

  const productMap = new Map((products || []).map((p) => [p.id, p]))

  let total = 0
  const invoiceItems = []
  for (const item of parsed.items) {
    const p = productMap.get(item.product_id)
    if (!p) return NextResponse.json({ error: 'Produk tidak tersedia' }, { status: 400, headers: NO_STORE })
    const lineTotal = Number(p.price) * item.qty
    total += lineTotal
    invoiceItems.push({ name: p.name, quantity: item.qty, price: Number(p.price) })
  }

  if (total <= 0) return NextResponse.json({ error: 'Total tidak valid' }, { status: 400, headers: NO_STORE })

  // Cari/buat kasir virtual "On the Table" agar transaksi masuk antrian kasir.
  let { data: virtualCashier } = await supabase
    .from('cashiers')
    .select('id')
    .eq('store_id', storeId)
    .eq('name', 'On the Table')
    .maybeSingle()

  if (!virtualCashier) {
    const { data: created } = await supabase
      .from('cashiers')
      .insert({ store_id: storeId, name: 'On the Table' })
      .select('id')
      .single()
    virtualCashier = created
  }

  const clientTxId = randomUUID()
  await submitTransactionRpc(supabase, {
    cashierId: virtualCashier?.id,
    items: parsed.items,
    paymentMethod: 'QRIS/TF',
    buyerName: `Meja ${tableNumber}`,
    customerPhone: null,
    clientTxId,
    receiptUrl: null,
  })

  // Biaya layanan pemesanan Rp 1.000 ditambahkan ke tagihan pelanggan.
  const serviceFee = 1000
  const invoiceAmount = total + serviceFee
  const orderId = `TABLE-${clientTxId}`

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const xenditRes = await createXenditInvoice({
    externalId: orderId,
    amount: invoiceAmount,
    description: `Pesanan meja ${tableNumber} - ${store.name}`,
    customerName: store.name,
    items: [...invoiceItems, { name: 'Biaya layanan pemesanan', quantity: 1, price: serviceFee }],
    successRedirectUrl: `${baseUrl}/t/${storeId}/${tableNumber}?payment=success`,
    failureRedirectUrl: `${baseUrl}/t/${storeId}/${tableNumber}?payment=failed`,
    callbackUrl: `${baseUrl}/api/payment/xendit/callback`,
  })

  const xenditData = await xenditRes.json()
  if (!xenditRes.ok || !xenditData?.id) {
    return NextResponse.json({ error: 'Gagal membuat invoice Xendit' }, { status: 502, headers: NO_STORE })
  }

  return NextResponse.json(
    { invoiceUrl: xenditData.invoice_url, invoiceId: xenditData.id, orderId },
    { headers: NO_STORE }
  )
}
