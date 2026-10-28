import 'server-only'
import { createServiceClient } from '@/utils/supabase/service'
import { getXenditInvoice, isXenditPaidStatus } from '@/lib/xendit'

/**
 * Order langganan yang masih 'pending' setelah batas ini dianggap gagal.
 *
 * Sistem kini menggunakan Xendit untuk semua transaksi pembayaran.
 * Link pembayaran yang ditinggalkan tetap terlihat "menunggu" di riwayat.
 * Batas 60 menit membuat daftar tidak menggantung dan mencegah order lama
 * dipakai lagi tanpa sengaja.
 */
export const PENDING_ORDER_TTL_MINUTES = 60

/**
 * Seberapa jauh ke belakang rekonsiliasi mencari order pending.
 *
 * Sengaja lebih panjang dari TTL di atas: kalau webhook tidak datang, order
 * yang sudah dibayar tetap harus bisa diselamatkan walau umurnya sudah lewat
 * satu jam. Invoice Xendit sendiri berlaku 24 jam.
 */
const RECONCILE_LOOKBACK_HOURS = 24

/**
 * Tandai order pending yang sudah lewat masa berlaku sebagai 'gagal'.
 *
 * Dipanggil saat halaman billing dibuka dan sebelum order baru dibuat. Aman
 * dipanggil berulang: fungsi database hanya menyentuh baris yang masih
 * 'pending' dan lebih tua dari batas.
 */
export async function expireStaleSubscriptionOrders() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('expire_stale_subscription_orders', {
      p_minutes: PENDING_ORDER_TTL_MINUTES,
    })

    if (error) {
      // Jangan gagalkan halaman billing hanya karena pembersihan gagal. Order
      // pending tetap tampil, hanya belum berubah status.
      console.error('Gagal menandai order pending sebagai gagal', {
        code: error.code,
        message: error.message,
      })
      return 0
    }

    return Number(data ?? 0)
  } catch (error) {
    console.error('expireStaleSubscriptionOrders gagal', { message: error?.message })
    return 0
  }
}

/**
 * Order ini pembelian add-on On the Table, bukan perpanjangan langganan.
 *
 * `plan` diisi oleh app/api/payment/route.js ('ON_TABLE_ADDON'), jadi penentuannya
 * cukup dari situ. Sebelumnya callback juga menebak lewat nominal Rp 50.000 --
 * tebakan yang bisa salah kalau suatu saat ada harga lain di angka itu.
 */
export function isAddonOrder(order) {
  return /on.?table|addon/i.test(String(order?.plan || ''))
}

/**
 * Terapkan invoice Xendit yang sudah lunas ke database. Satu implementasi untuk
 * tiga jalur yang bisa tiba bersamaan: webhook, tombol "Cek Status", dan
 * rekonsiliasi saat halaman billing dibuka.
 *
 * Idempoten: perpanjangan lewat RPC yang mengunci baris order, add-on ditandai
 * `consumed_at` sehingga pemanggilan kedua tidak mengubah apa pun.
 */
export async function applyPaidInvoice(service, order, invoice) {
  if (!order || !invoice) return { applied: false, reason: 'not_found' }
  if (!isXenditPaidStatus(invoice)) return { applied: false, reason: 'unpaid' }

  // Sudah pernah diproses: jangan aktifkan dua kali.
  if (order.consumed_at) return { applied: false, reason: 'already_consumed' }

  if (invoice.external_id && invoice.external_id !== order.order_id) {
    return { applied: false, reason: 'external_id_mismatch' }
  }

  if (Number(invoice.amount) !== Number(order.amount)) {
    return { applied: false, reason: 'amount_mismatch' }
  }

  const now = new Date().toISOString()
  const invoiceId = invoice.id ?? order.xendit_invoice_id ?? null

  if (isAddonOrder(order)) {
    // Add-on tidak mengubah masa langganan; cukup tandai lunas dan aktifkan fitur.
    const { error: orderErr } = await service
      .from('subscription_orders')
      .update({
        status: 'paid',
        consumed_at: now,
        xendit_invoice_id: invoiceId,
        updated_at: now,
      })
      .eq('order_id', order.order_id)

    if (orderErr) {
      console.error('Gagal menandai order add-on lunas', {
        orderId: order.order_id,
        code: orderErr.code,
        message: orderErr.message,
      })
      return { applied: false, reason: 'db_error' }
    }

    const { error: storeErr } = await service
      .from('stores')
      .update({ on_table_enabled: true, updated_at: now })
      .eq('id', order.store_id)

    if (storeErr) {
      // Ini yang membuat pelanggan "sudah bayar tapi fitur tidak aktif".
      // Sebelumnya error-nya dibuang tanpa jejak.
      console.error('Gagal mengaktifkan on_table_enabled', {
        storeId: order.store_id,
        code: storeErr.code,
        message: storeErr.message,
      })
      return { applied: false, reason: 'db_error' }
    }

    return { applied: true, addon: true, expiresAt: null }
  }

  const { data, error } = await service.rpc('consume_subscription_order', {
    p_order_id: order.order_id,
    p_gross_amount: Number(invoice.amount),
    p_xendit_invoice_id: invoiceId,
    p_payload: invoice,
    p_days: order.plan === 'PRO_ANNUAL' || Number(order.amount) >= 700000 ? 365 : 30,
  })

  if (error) {
    console.error('consume_subscription_order gagal', {
      orderId: order.order_id,
      code: error.code,
      message: error.message,
    })
    return { applied: false, reason: 'rpc_error' }
  }

  const result = Array.isArray(data) ? data[0] : data

  return {
    applied: Boolean(result?.applied),
    reason: result?.reason ?? null,
    expiresAt: result?.subscription_end_date ?? null,
  }
}

/**
 * Periksa sendiri order yang masih pending ke Xendit, lalu terapkan yang sudah
 * lunas. Dipanggil saat halaman billing dibuka.
 *
 * Webhook tetap jalur utama, tapi di mode test -- atau kalau URL webhook salah
 * pasang -- notifikasi bisa tidak pernah datang. Tanpa ini, pembeli yang sudah
 * membayar hanya melihat tombol "beli" lagi.
 */
export async function reconcilePendingOrders(storeId, { limit = 3 } = {}) {
  if (!storeId) return 0

  try {
    const service = createServiceClient()
    const since = new Date(
      Date.now() - RECONCILE_LOOKBACK_HOURS * 60 * 60 * 1000
    ).toISOString()

    const { data: orders, error } = await service
      .from('subscription_orders')
      .select('order_id, store_id, amount, plan, consumed_at, xendit_invoice_id')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !orders?.length) return 0

    let applied = 0

    for (const order of orders) {
      if (!order.xendit_invoice_id) continue

      const invoice = await getXenditInvoice(order.xendit_invoice_id)
      if (!invoice) continue

      const result = await applyPaidInvoice(service, order, invoice)
      if (result.applied) applied += 1
    }

    return applied
  } catch (error) {
    console.error('reconcilePendingOrders gagal', { message: error?.message })
    return 0
  }
}
