import { NextResponse } from 'next/server'
import { authorizeCashier, readCashierToken, tokenBucket } from '@/lib/cashierAuth'
import { normalizePhone, parseRupiah } from '@/lib/format'
import { checkRateLimit, tooManyRequests } from '@/lib/rateLimit'
import { normalizeItems, PAYMENT_METHODS, submitTransactionRpc } from '@/lib/transaction'

const NO_STORE = { 'cache-control': 'private, no-store' }
const MAX_RECEIPT_BYTES = 6 * 1024 * 1024
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function jsonError(error, status) {
  return NextResponse.json({ error }, { status, headers: NO_STORE })
}

async function removeReceipt(supabase, receiptPath) {
  if (!receiptPath) return
  const { error } = await supabase.storage.from('receipts').remove([receiptPath])
  if (error) console.error('Hapus bukti gagal', { message: error.message })
}

export async function POST(request) {
  const token = readCashierToken(request)
  if (token) {
    const rate = await checkRateLimit(tokenBucket('cashier:transaction', token), {
      limit: 30,
      windowSeconds: 60,
    })
    if (!rate.allowed) return tooManyRequests(rate.retryAfter)
  }

  const auth = await authorizeCashier(request)
  if (auth.error) return jsonError(auth.error, auth.status)

  const { cashier, supabase } = auth

  let formData
  try {
    formData = await request.formData()
  } catch {
    return jsonError('Form transaksi tidak valid.', 400)
  }

  const paymentMethod = String(formData.get('paymentMethod') || '')
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    return jsonError('Metode pembayaran belum dipilih.', 400)
  }

  const parsed = normalizeItems(formData.get('items'))
  if (parsed.error) return jsonError(parsed.error, 400)

  const rawPhone = String(formData.get('customerPhone') || '').trim()
  const customerPhone = normalizePhone(rawPhone)
  if (rawPhone && !customerPhone) {
    return jsonError('Nomor HP pembeli tidak valid. Contoh: 081234567890.', 400)
  }

  const cashReceived =
    paymentMethod === 'CASH' ? parseRupiah(formData.get('cashReceived')) : null
  const rawTxId = String(formData.get('clientTxId') || '').trim()
  const clientTxId = UUID_RE.test(rawTxId) ? rawTxId : null
  const buyerName = String(formData.get('buyerName') || '').trim().slice(0, 120) || null
  const receiptFile = formData.get('receipt')
  const hasReceipt =
    paymentMethod === 'QRIS/TF' &&
    receiptFile &&
    typeof receiptFile.arrayBuffer === 'function' &&
    receiptFile.size > 0

  let receiptPath = null
  let receiptUrl = null

  try {
    if (hasReceipt) {
      if (receiptFile.size > MAX_RECEIPT_BYTES) {
        return jsonError('Bukti pembayaran terlalu besar (maksimal 6 MB).', 400)
      }

      const buffer = Buffer.from(await receiptFile.arrayBuffer())
      const safeName = String(receiptFile.name || 'bukti.jpg')
        .replace(/[^a-zA-Z0-9.-]/g, '')
        .slice(-60)
      receiptPath = `${cashier.store_id}/${Date.now()}-${safeName || 'bukti.jpg'}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(receiptPath, buffer, {
          contentType: receiptFile.type || 'image/jpeg',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload bukti gagal', { message: uploadError.message })
        return jsonError('Gagal unggah bukti pembayaran. Coba lagi.', 500)
      }

      receiptUrl = supabase.storage.from('receipts').getPublicUrl(receiptPath).data.publicUrl
    }

    const result = await submitTransactionRpc(supabase, {
      token: auth.token,
      items: parsed.items,
      paymentMethod,
      cashReceived,
      buyerName,
      customerPhone,
      clientTxId,
      receiptUrl,
    })

    if (result.error) {
      await removeReceipt(supabase, receiptPath)
      return jsonError(result.error, 422)
    }

    // Retry yang idempoten menunjuk transaksi lama. Bukti yang baru saja
    // diunggah oleh retry ini tidak dipakai transaksi tersebut, jadi bersihkan.
    if (result.idempotent) {
      await removeReceipt(supabase, receiptPath)
    }

    return NextResponse.json(
      {
        success: true,
        transactionId: result.transactionId,
        subtotal: result.subtotal,
        discountPercent: result.discountPercent,
        discount: result.discount,
        total: result.total,
        cashReceived: result.cashReceived,
        changeAmount: result.changeAmount,
        status: result.status,
        queueNumber: result.queueNumber,
        productName: result.productName,
        idempotent: result.idempotent,
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    await removeReceipt(supabase, receiptPath)
    console.error('POST /api/cashier/transactions gagal', { message: error?.message })
    return jsonError('Terjadi kesalahan. Coba lagi.', 500)
  }
}
