import 'server-only'
import { submitTransactionRpc } from '@/lib/transaction'
import { isXenditPaidStatus } from '@/lib/xendit'

/**
 * Biaya layanan pemesanan yang ditambahkan ke tagihan pelanggan.
 * Dipakai juga oleh halaman meja supaya angka yang tampil sama dengan tagihan.
 */
export const TABLE_SERVICE_FEE_IDR = 1000

export const TABLE_ORDER_STATUS = {
  pending: 'pending',
  paid: 'paid',
  expired: 'expired',
  failed: 'failed',
  amountMismatch: 'amount_mismatch',
}

/** Prefix external_id invoice Xendit untuk pesanan meja. */
export const TABLE_INVOICE_PREFIX = 'TABLE-'

export function tableInvoiceExternalId(orderId) {
  return `${TABLE_INVOICE_PREFIX}${orderId}`
}

export function isTableInvoiceExternalId(externalId) {
  return String(externalId || '').startsWith(TABLE_INVOICE_PREFIX)
}

export function tableOrderIdFromInvoice(externalId) {
  return String(externalId || '').slice(TABLE_INVOICE_PREFIX.length)
}

/**
 * Kasir virtual "On the Table" dipakai supaya transaksi tetap punya cashier_id
 * (kolomnya wajib) tanpa mengarang akun kasir milik orang.
 */
export async function getOrCreateTableCashier(supabase, storeId) {
  const { data: existing } = await supabase
    .from('cashiers')
    .select('id')
    .eq('store_id', storeId)
    .eq('name', 'On the Table')
    .maybeSingle()

  if (existing) return existing

  const { data: created, error } = await supabase
    .from('cashiers')
    .insert({ store_id: storeId, name: 'On the Table' })
    .select('id')
    .single()

  if (error) {
    console.error('Gagal membuat kasir virtual On the Table', {
      storeId,
      code: error.code,
      message: error.message,
    })
    return null
  }

  return created
}

/**
 * Ubah pesanan meja yang sudah dibayar menjadi transaksi sungguhan:
 * stok berkurang, nomor antrean terbit, pesanan masuk KDS dan antrean kasir.
 *
 * Idempoten. `client_tx_id` diisi id pesanan meja, jadi webhook dan polling
 * halaman status yang berjalan bersamaan tidak bisa membuat dua transaksi.
 */
export async function settleTableOrder(supabase, order, invoice) {
  if (!order || !invoice) return { status: TABLE_ORDER_STATUS.pending }
  if (order.status === TABLE_ORDER_STATUS.paid) {
    return {
      status: TABLE_ORDER_STATUS.paid,
      queueNumber: order.queue_number ?? null,
      transactionId: order.transaction_id ?? null,
    }
  }
  if (!isXenditPaidStatus(invoice)) {
    return { status: order.status || TABLE_ORDER_STATUS.pending }
  }

  if (Number(invoice.amount) !== Number(order.amount)) {
    await supabase
      .from('table_orders')
      .update({
        status: TABLE_ORDER_STATUS.amountMismatch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
    return { status: TABLE_ORDER_STATUS.amountMismatch }
  }

  const cashier = await getOrCreateTableCashier(supabase, order.store_id)
  if (!cashier?.id) {
    return { status: TABLE_ORDER_STATUS.pending, error: 'cashier_unavailable' }
  }

  // Hanya kolom yang dipahami normalizeItems yang dikirim ke RPC; nama & harga
  // di order.items hanya untuk tampilan.
  const rpcItems = (Array.isArray(order.items) ? order.items : []).map((item) => ({
    product_id: item.product_id,
    qty: item.qty,
    subs: Array.isArray(item.subs) ? item.subs : [],
  }))

  const result = await submitTransactionRpc(supabase, {
    cashierId: cashier.id,
    items: rpcItems,
    paymentMethod: 'QRIS/TF',
    buyerName: `Meja ${order.table_number}`,
    customerPhone: null,
    clientTxId: order.id,
    receiptUrl: invoice.invoice_url ?? null,
  })

  if (result.error) {
    // Terjadi kalau stok habis di antara pembuatan invoice dan pembayaran.
    // Uangnya sudah masuk, jadi pesanan tidak dihapus: ditandai agar pemilik
    // melihatnya dan bisa menindaklanjuti (refund / ganti menu).
    console.error('Pesanan meja gagal dicatat setelah dibayar', {
      orderId: order.id,
      reason: result.error,
    })

    await supabase
      .from('table_orders')
      .update({
        status: TABLE_ORDER_STATUS.failed,
        failure_reason: result.error,
        xendit_invoice_id: invoice.id ?? order.xendit_invoice_id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    return { status: TABLE_ORDER_STATUS.failed, error: result.error }
  }

  const now = new Date().toISOString()

  // Transaksi dari submit_transaction belum tahu nomor meja dan (kalau toko
  // tidak memakai waiting list) berstatus 'completed'. Update ini memicu
  // trigger assign_fnb_queue_number sehingga nomor antrean terbit.
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .update({
      table_number: order.table_number,
      kitchen_status: 'pending',
      status: 'pending',
    })
    .eq('id', result.transactionId)
    .select('id, queue_number')
    .maybeSingle()

  if (txError) {
    console.error('Gagal menandai transaksi meja', {
      orderId: order.id,
      code: txError.code,
      message: txError.message,
    })
  }

  const queueNumber = tx?.queue_number ?? result.queueNumber ?? null

  // Biaya layanan ditagih lewat Xendit tetapi bukan produk katalog, jadi ia
  // dicatat sebagai baris item tanpa product_id. Dengan begitu struk, KDS, dan
  // laporan menampilkan angka yang sama dengan yang dibayar pelanggan.
  if (Number(order.service_fee) > 0) {
    const { data: existingFee } = await supabase
      .from('transaction_items')
      .select('id')
      .eq('transaction_id', result.transactionId)
      .is('product_id', null)
      .eq('name', 'Biaya layanan pemesanan')
      .maybeSingle()

    if (!existingFee) {
      const { data: lastLine } = await supabase
        .from('transaction_items')
        .select('line_index')
        .eq('transaction_id', result.transactionId)
        .order('line_index', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { error: feeError } = await supabase.from('transaction_items').insert({
        transaction_id: result.transactionId,
        product_id: null,
        name: 'Biaya layanan pemesanan',
        unit_price: Number(order.service_fee),
        qty: 1,
        line_total: Number(order.service_fee),
        line_index: Number(lastLine?.line_index ?? 0) + 1,
        sub_index: 0,
      })

      if (feeError) {
        console.error('Gagal mencatat biaya layanan pesanan meja', {
          orderId: order.id,
          code: feeError.code,
          message: feeError.message,
        })
      }
    }

    await supabase
      .from('transactions')
      .update({
        amount: Number(order.amount),
        original_amount: Number(order.amount),
      })
      .eq('id', result.transactionId)
  }

  await supabase
    .from('table_orders')
    .update({
      status: TABLE_ORDER_STATUS.paid,
      transaction_id: result.transactionId,
      queue_number: queueNumber,
      xendit_invoice_id: invoice.id ?? order.xendit_invoice_id ?? null,
      paid_at: now,
      updated_at: now,
    })
    .eq('id', order.id)

  return {
    status: TABLE_ORDER_STATUS.paid,
    queueNumber,
    transactionId: result.transactionId,
  }
}
