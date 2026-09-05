'use server'

import { createServiceClient } from '@/utils/supabase/service'
import { normalizePhone } from '@/lib/format'
import { normalizeItems, submitTransactionRpc, PAYMENT_METHODS } from '@/lib/transaction'

// KEAMANAN & INTEGRITAS.
//
// Yang dipercaya dari client di sini: token kasir (satu-satunya kredensial),
// product_id + qty, metode bayar, uang diterima, nama/nomor pembeli, dan
// client_tx_id untuk idempotensi.
//
// Yang TIDAK diterima dari client: store_id, cashier_id, harga, subtotal,
// diskon, total, status, dan nama produk. Sebelumnya `amount` datang langsung
// dari form (temuan C1) -- siapa pun dengan satu token kasir valid bisa
// mencatat omzet berapa pun. `storeId` juga dari form (A1), dipakai apa adanya
// dengan service-role key yang melewati RLS.
//
// P2: seluruh logika bisnis pindah ke satu fungsi Postgres,
// `submit_transaction()` (supabase/migrations/0003_transaction_rpc.sql). File
// ini sekarang tinggal tiga langkah: validasi bentuk input -> unggah bukti ke
// Storage -> satu RPC. Yang ikut selesai karena itu:
//   * C4 stok, transaksi, item, dan pelanggan jadi SATU transaksi DB. Versi
//     sebelumnya mengurangi stok lewat compare-and-swap lalu mengembalikannya
//     lagi kalau insert gagal -- kompensasi, bukan atomisitas.
//   * C3 stok dikurangi dengan baris yang sudah di-lock, tidak bisa minus.
//   * C6 `client_tx_id` unik: retry antrean offline mengembalikan transaksi yang
//     sama, bukan mencatat dobel.
//   * C10 bot Telegram memanggil RPC yang sama, jadi kedua jalur ingest
//     akhirnya punya satu set aturan bisnis.

const MAX_RECEIPT_BYTES = 6 * 1024 * 1024
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function submitTransaction(formData) {
  try {
    const token = String(formData.get('token') || '')
    if (!token) return { error: 'Sesi kasir tidak valid. Muat ulang halaman.' }

    const paymentMethod = String(formData.get('paymentMethod') || '')
    if (!PAYMENT_METHODS.has(paymentMethod)) return { error: 'Metode pembayaran belum dipilih.' }

    // Validasi bentuk di sini hanya untuk pesan yang lebih jelas; yang
    // otoritatif tetap RPC-nya.
    const parsed = normalizeItems(formData.get('items'))
    if (parsed.error) return { error: parsed.error }

    const rawPhone = String(formData.get('customerPhone') || '').trim()
    const customerPhone = normalizePhone(rawPhone)
    // Nomor HP itu opsional, tapi kalau kasir sudah mengetik sesuatu yang tidak
    // bisa dibaca, lebih baik diberi tahu daripada diam-diam dibuang -- diam
    // berarti kunjungan pelanggannya tidak pernah tercatat tanpa ada yang tahu.
    if (rawPhone && !customerPhone) {
      return { error: 'Nomor HP pembeli tidak valid. Contoh: 081234567890.' }
    }

    const digits = String(formData.get('cashReceived') || '').replace(/[^\d]/g, '')
    const cashReceived = paymentMethod === 'CASH' && digits ? Number.parseInt(digits, 10) : null

    const rawTxId = String(formData.get('clientTxId') || '')
    const clientTxId = UUID_RE.test(rawTxId) ? rawTxId : null

    const supabase = createServiceClient()

    // --- Bukti pembayaran -------------------------------------------------
    // Upload tidak bisa dilakukan dari dalam PL/pgSQL, jadi ini satu-satunya
    // langkah yang tetap di sisi aplikasi. RPC yang memutuskan apakah bukti
    // WAJIB (store.receipt_required), sehingga aturannya tidak terduplikasi.
    const receiptFile = formData.get('receipt')
    const hasReceipt =
      paymentMethod === 'QRIS/TF' &&
      receiptFile &&
      typeof receiptFile.arrayBuffer === 'function' &&
      receiptFile.size > 0

    let receiptUrl = null
    let receiptPath = null

    if (hasReceipt) {
      if (receiptFile.size > MAX_RECEIPT_BYTES) {
        return { error: 'Bukti pembayaran terlalu besar (maksimal 6 MB).' }
      }

      // Satu lookup, hanya untuk membentuk path `<store_id>/...`. Token yang
      // salah berhenti di sini, sebelum ada file yang diunggah.
      const { data: cashier } = await supabase
        .from('cashiers')
        .select('store_id')
        .eq('token', token)
        .maybeSingle()

      if (!cashier) return { error: 'Link kasir tidak valid.' }

      const buffer = Buffer.from(await receiptFile.arrayBuffer())
      const safeName = String(receiptFile.name || 'bukti.jpg')
        .replace(/[^a-zA-Z0-9.-]/g, '')
        .slice(-60)
      receiptPath = `${cashier.store_id}/${Date.now()}-${safeName || 'bukti.jpg'}`

      const { error: upErr } = await supabase.storage
        .from('receipts')
        .upload(receiptPath, buffer, {
          contentType: receiptFile.type || 'image/jpeg',
          upsert: false,
        })

      if (upErr) {
        console.error('Upload bukti gagal', { message: upErr.message })
        return { error: 'Gagal unggah bukti pembayaran. Coba lagi.' }
      }

      receiptUrl = supabase.storage.from('receipts').getPublicUrl(receiptPath).data.publicUrl
    }

    // --- Satu pintu masuk -------------------------------------------------
    const result = await submitTransactionRpc(supabase, {
      token,
      items: parsed.items,
      paymentMethod,
      cashReceived,
      buyerName: String(formData.get('buyerName') || '').trim().slice(0, 120) || null,
      customerPhone,
      clientTxId,
      receiptUrl,
    })

    if (result.error) {
      // Transaksinya ditolak, jadi filenya tidak akan pernah dirujuk siapa pun.
      // Dihapus supaya bucket tidak menumpuk bukti tanpa induk.
      if (receiptPath) {
        const { error: rmErr } = await supabase.storage.from('receipts').remove([receiptPath])
        if (rmErr) console.error('Hapus bukti gagal', { message: rmErr.message })
      }
      return { error: result.error }
    }

    return {
      success: true,
      transactionId: result.transactionId,
      subtotal: result.subtotal,
      discountPercent: result.discountPercent,
      discount: result.discount,
      total: result.total,
      changeAmount: result.changeAmount,
      idempotent: result.idempotent,
    }
  } catch (error) {
    // Pesan internal tidak pernah diteruskan ke kasir.
    console.error('submitTransaction gagal', { message: error?.message })
    return { error: 'Terjadi kesalahan. Coba lagi.' }
  }
}
