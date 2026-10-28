import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { createXenditInvoice } from '@/lib/xendit'
import { normalizeItems } from '@/lib/transactionValidation'
import { resolveBaseUrl } from '@/lib/site'
import {
  TABLE_SERVICE_FEE_IDR,
  tableInvoiceExternalId,
} from '@/lib/tableOrderFlow'

const NO_STORE = { 'cache-control': 'private, no-store' }

/**
 * Pesanan meja dibuat SEBELUM pembayaran, tetapi belum menjadi transaksi.
 *
 * Stok diperiksa di sini supaya pelanggan tidak diarahkan ke halaman bayar
 * untuk menu yang sudah habis, lalu diperiksa ulang secara atomik oleh
 * submit_transaction() saat pembayaran diterima (satu-satunya penulis stok).
 */
export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400, headers: NO_STORE })
  }

  const { storeId, tableNumber, items: rawItems } = body || {}
  if (!storeId) {
    return NextResponse.json({ error: 'storeId diperlukan' }, { status: 400, headers: NO_STORE })
  }

  const table = Number.parseInt(tableNumber, 10)
  if (!Number.isFinite(table) || table < 1) {
    return NextResponse.json({ error: 'Nomor meja tidak valid' }, { status: 400, headers: NO_STORE })
  }

  const parsed = normalizeItems(rawItems)
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: NO_STORE })
  }

  const supabase = createServiceClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, on_table_enabled')
    .eq('id', storeId)
    .maybeSingle()

  if (!store) return NextResponse.json({ error: 'Toko tidak ditemukan' }, { status: 404, headers: NO_STORE })
  if (!store.on_table_enabled) {
    return NextResponse.json(
      { error: 'Fitur On the Table belum aktif. Aktifkan add-on PRO terlebih dahulu.' },
      { status: 403, headers: NO_STORE }
    )
  }

  // Kumpulkan seluruh product_id (utama + tambahan) untuk satu kali query.
  const productIds = new Set()
  for (const item of parsed.items) {
    productIds.add(item.product_id)
    for (const sub of item.subs || []) productIds.add(sub.product_id)
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock, is_sub_product')
    .eq('store_id', storeId)
    .in('id', [...productIds])

  const productMap = new Map((products || []).map((p) => [p.id, p]))

  // Hitung kebutuhan stok per produk (termasuk sub-produk) sebelum menyentuh uang.
  const needed = new Map()
  const addNeeded = (productId, qty) => {
    needed.set(productId, (needed.get(productId) || 0) + qty)
  }

  for (const item of parsed.items) {
    const product = productMap.get(item.product_id)
    if (!product) {
      return NextResponse.json(
        { error: 'Ada menu yang sudah tidak tersedia. Muat ulang halaman.' },
        { status: 409, headers: NO_STORE }
      )
    }
    if (product.is_sub_product) {
      return NextResponse.json(
        { error: 'Menu tidak valid. Muat ulang halaman.' },
        { status: 400, headers: NO_STORE }
      )
    }
    addNeeded(item.product_id, item.qty)

    for (const sub of item.subs || []) {
      const subProduct = productMap.get(sub.product_id)
      if (!subProduct) {
        return NextResponse.json(
          { error: 'Ada tambahan menu yang sudah tidak tersedia. Muat ulang halaman.' },
          { status: 409, headers: NO_STORE }
        )
      }
      if (!subProduct.is_sub_product) {
        return NextResponse.json(
          { error: 'Tambahan menu tidak valid. Muat ulang halaman.' },
          { status: 400, headers: NO_STORE }
        )
      }
      addNeeded(sub.product_id, sub.qty)
    }
  }

  for (const [productId, qty] of needed) {
    const product = productMap.get(productId)
    const stock = Number(product?.stock ?? 0)
    if (stock < qty) {
      return NextResponse.json(
        {
          error:
            stock <= 0
              ? `"${product.name}" sudah habis.`
              : `Stok "${product.name}" tinggal ${stock}.`,
          productId,
          stock,
        },
        { status: 409, headers: NO_STORE }
      )
    }
  }

  const snapshot = parsed.items.map((item) => {
    const product = productMap.get(item.product_id)
    return {
      product_id: item.product_id,
      name: product.name,
      price: Number(product.price),
      qty: item.qty,
      subs: (item.subs || []).map((sub) => {
        const subProduct = productMap.get(sub.product_id)
        return {
          product_id: sub.product_id,
          name: subProduct.name,
          price: Number(subProduct.price),
          qty: sub.qty,
        }
      }),
    }
  })

  const subtotal = snapshot.reduce((sum, item) => {
    const subsTotal = item.subs.reduce((s, sub) => s + sub.price * sub.qty, 0)
    return sum + item.price * item.qty + subsTotal
  }, 0)

  const serviceFee = TABLE_SERVICE_FEE_IDR
  const amount = subtotal + serviceFee

  if (amount <= 0) {
    return NextResponse.json({ error: 'Total tidak valid' }, { status: 400, headers: NO_STORE })
  }

  const { data: order, error: orderError } = await supabase
    .from('table_orders')
    .insert({
      store_id: storeId,
      table_number: table,
      items: snapshot,
      subtotal,
      service_fee: serviceFee,
      amount,
      status: 'pending',
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('Gagal menyimpan pesanan meja', {
      storeId,
      code: orderError?.code,
      message: orderError?.message,
    })
    const missingTable =
      orderError?.code === '42P01' ||
      orderError?.code === 'PGRST205' ||
      /table_orders/.test(orderError?.message || '')

    return NextResponse.json(
      {
        error: missingTable
          ? 'Tabel pesanan meja belum terpasang. Jalankan migrasi 0018.'
          : 'Gagal menyimpan pesanan. Coba lagi.',
      },
      { status: 500, headers: NO_STORE }
    )
  }

  const baseUrl = resolveBaseUrl(req)
  const externalId = tableInvoiceExternalId(order.id)

  const xenditRes = await createXenditInvoice({
    externalId,
    amount,
    description: `Pesanan Meja ${table} - ${store.name}`,
    customerName: store.name,
    items: [
      ...snapshot.map((item) => ({
        name: item.name,
        quantity: item.qty,
        price: item.price,
      })),
      ...(serviceFee > 0
        ? [{ name: 'Biaya layanan pemesanan', quantity: 1, price: serviceFee }]
        : []),
    ],
    successRedirectUrl: `${baseUrl}/t/${storeId}/${table}?payment=success&order=${order.id}`,
    failureRedirectUrl: `${baseUrl}/t/${storeId}/${table}?payment=failed&order=${order.id}`,
  })

  const xenditData = await xenditRes.json()

  if (!xenditRes.ok || !xenditData?.id) {
    await supabase
      .from('table_orders')
      .update({
        status: 'failed',
        failure_reason: xenditData?.error_code || 'invoice_failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    console.error('Gagal membuat invoice pesanan meja', {
      orderId: order.id,
      status: xenditRes.status,
      code: xenditData?.error_code || xenditData?.code,
      message: xenditData?.message,
    })

    return NextResponse.json(
      { error: 'Gagal membuat pembayaran. Coba lagi.' },
      { status: 502, headers: NO_STORE }
    )
  }

  await supabase
    .from('table_orders')
    .update({
      xendit_invoice_id: xenditData.id,
      invoice_url: xenditData.invoice_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  return NextResponse.json(
    {
      orderId: order.id,
      invoiceUrl: xenditData.invoice_url,
      amount,
      subtotal,
      serviceFee,
    },
    { headers: NO_STORE }
  )
}
