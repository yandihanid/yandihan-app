import { NextResponse } from 'next/server'
import { authorizeCashier, readCashierToken, tokenBucket } from '@/lib/cashierAuth'
import { checkRateLimit, tooManyRequests } from '@/lib/rateLimit'
import { isCopyReceipt } from '@/lib/receiptPrinter'

// Mencetak struk dari menu Antrean.
//
// Endpoint ini satu-satunya tempat yang menaikkan penghitung cetakan, jadi
// keputusan "struk ini COPY atau bukan" selalu dihitung dari satu sumber.
//
// Aturannya (lihat lib/receiptPrinter.js):
//   - Pesanan On the Table: pelanggan membayar sendiri di HP-nya, jadi cetakan
//     pertama dari menu Antrean masih struk asli; cetakan kedua dan seterusnya
//     diberi label "COPY".
//   - Transaksi langsung di link kasir: struk asli sudah diberikan ke pembeli
//     begitu transaksi berhasil (kasir langsung diarahkan ke halaman struk),
//     jadi setiap cetakan dari menu Antrean adalah "COPY".

const NO_STORE = { 'cache-control': 'private, no-store' }

export async function POST(req) {
  const token = readCashierToken(req)
  if (token) {
    const rate = await checkRateLimit(tokenBucket('cashier:receipt-print', token), {
      limit: 60,
      windowSeconds: 60,
    })
    if (!rate.allowed) return tooManyRequests(rate.retryAfter)
  }

  const auth = await authorizeCashier(req)
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: NO_STORE }
    )
  }

  const { cashier, supabase } = auth

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400, headers: NO_STORE })
  }

  const id = typeof body?.id === 'string' ? body.id.trim() : ''
  if (!id) {
    return NextResponse.json(
      { error: 'id transaksi diperlukan' },
      { status: 400, headers: NO_STORE }
    )
  }

  // store_id ikut diteruskan ke RPC: token toko A tidak boleh menghitung
  // cetakan struk toko B.
  const { data, error } = await supabase.rpc('bump_receipt_print_count', {
    p_transaction_id: id,
    p_store_id: cashier.store_id,
  })

  if (error) {
    // Fungsi ini dibuat di migrasi 0023. Kalau belum dijalankan, fitur cetak
    // struk dari menu Antrean belum bisa dipakai -- errornya dibuat jelas,
    // bukan diam-diam.
    console.error('Gagal menambah penghitung cetak struk', { code: error.code })
    return NextResponse.json(
      {
        error:
          error.code === '42883'
            ? 'Fitur cetak struk belum siap. Jalankan migrasi 0023 di Supabase.'
            : 'Gagal menyiapkan struk',
      },
      { status: 500, headers: NO_STORE }
    )
  }

  const printCount = Number(data?.print_count ?? 0)
  if (printCount === 0) {
    return NextResponse.json(
      { error: 'Transaksi tidak ditemukan' },
      { status: 404, headers: NO_STORE }
    )
  }

  return NextResponse.json(
    {
      id,
      printCount,
      copy: isCopyReceipt({
        tableNumber: data?.table_number ?? null,
        printCount,
      }),
    },
    { headers: NO_STORE }
  )
}
