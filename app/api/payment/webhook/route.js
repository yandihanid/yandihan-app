import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { verifyMidtransSignature, isPaidStatus } from '@/lib/midtrans'
import { checkRateLimit, tooManyRequests, clientIp } from '@/lib/rateLimit'

// KEAMANAN (temuan A2). Versi sebelumnya:
//   * tidak memverifikasi signature_key -> POST tak terautentikasi dari siapa
//     pun bisa mengubah tabel `stores`
//   * mempercayai `body.metadata.store_id` -> penyerang menentukan sendiri toko
//     mana yang di-upgrade
//   * menulis kolom `status` yang tidak dibaca file lain (seharusnya
//     `subscription_tier`) -> jadi rusak DAN tidak berfungsi
//
// Sekarang: signature diverifikasi, toko diambil dari tabel
// subscription_orders (bukan dari body), dan perpanjangannya lewat RPC
// consume_subscription_order() yang mengunci baris order sehingga satu
// pembayaran tidak bisa dipakai dua kali.

export async function POST(req) {
  const ip = clientIp(req)

  const rate = await checkRateLimit(`midtrans:webhook:${ip}`, { limit: 60, windowSeconds: 60 })
  if (!rate.allowed) return tooManyRequests(rate.retryAfter)

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  if (!verifyMidtransSignature(body)) {
    // Jangan bocorkan alasan detailnya.
    return NextResponse.json({ error: 'Signature tidak valid' }, { status: 401 })
  }

  // Status selain lunas (pending, expire, cancel, deny) tidak perlu tindakan.
  // Tetap balas 200 supaya Midtrans berhenti mengirim ulang notifikasi.
  if (!isPaidStatus(body)) {
    return NextResponse.json({ message: 'Diterima, belum lunas' }, { status: 200 })
  }

  const service = createServiceClient()
  const { data, error } = await service.rpc('consume_subscription_order', {
    p_order_id: body.order_id,
    p_gross_amount: Number(body.gross_amount),
    p_midtrans_transaction_id: body.transaction_id ?? null,
    p_payload: body,
    p_days: 30,
  })

  if (error) {
    // 500 di sini disengaja: Midtrans akan mencoba lagi, dan itu yang kita mau
    // kalau kegagalannya di sisi kita (DB). RPC-nya idempoten, jadi percobaan
    // ulang tidak akan memperpanjang langganan dua kali.
    console.error('consume_subscription_order gagal', { orderId: body.order_id, code: error.code })
    return NextResponse.json({ error: 'Gagal memproses' }, { status: 500 })
  }

  const result = Array.isArray(data) ? data[0] : data

  if (result?.reason === 'order_not_found') {
    // Signature valid tapi order tidak ada di DB kita: kemungkinan notifikasi
    // dari project Midtrans lain yang memakai server key yang sama. Balas 200
    // supaya tidak diretry selamanya.
    console.warn('Notifikasi Midtrans untuk order yang tidak dikenal', { orderId: body.order_id })
    return NextResponse.json({ message: 'Order tidak dikenal' }, { status: 200 })
  }

  if (result?.reason === 'amount_mismatch') {
    console.error('Jumlah pembayaran tidak cocok dengan order', { orderId: body.order_id })
    return NextResponse.json({ message: 'Jumlah tidak cocok' }, { status: 200 })
  }

  return NextResponse.json(
    { message: result?.applied ? 'Langganan diperpanjang' : 'Sudah diproses sebelumnya' },
    { status: 200 }
  )
}
