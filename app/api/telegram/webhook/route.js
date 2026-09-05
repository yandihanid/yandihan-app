import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/utils/supabase/service'
import { maxCashiers, planTier } from '@/lib/plan'
import { checkRateLimit } from '@/lib/rateLimit'
import { formatRupiah } from '@/lib/format'
import { submitTransactionRpc, MAX_LINES, MAX_QTY } from '@/lib/transaction'

// KEAMANAN (temuan A3). Sebelumnya endpoint ini menerima POST dari siapa pun.
// Siapa pun yang tahu `unique_code` sebuah toko (8 karakter, dibagikan pemilik
// ke pegawainya) bisa mendaftarkan dirinya sebagai kasir toko itu lalu
// menyuntikkan transaksi palsu ke ledger. Sekarang setiap update wajib membawa
// header X-Telegram-Bot-Api-Secret-Token yang cocok dengan
// TELEGRAM_WEBHOOK_SECRET.
//
// Pasang sekali di sisi Telegram (ganti dengan nilai Anda sendiri):
//   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
//     -d "url=https://<domain>/api/telegram/webhook" \
//     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
//
// Selama TELEGRAM_WEBHOOK_SECRET belum diisi, endpoint ini menolak semua
// request. Itu disengaja (fail-closed): bot mati lebih baik daripada bot yang
// bisa dipakai orang lain untuk menulis ke pembukuan toko.
//
// INTEGRITAS (temuan C10). Jalur ini dulu punya aturan bisnisnya sendiri:
// nominal diambil apa adanya dari teks pesan, stok tidak pernah dikurangi,
// `status` tidak pernah di-set, dan tidak ada diskon maupun pencatatan
// pelanggan. Sekarang ia memanggil RPC `submit_transaction()` yang sama dengan
// jalur web, jadi harga dibaca dari daftar produk, stok berkurang, dan status
// mengikuti setelan toko. Konsekuensinya: laporan harus menyebut PRODUK, bukan
// sekadar nominal.

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`

function secretMatches(received) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected || !received) return false
  const a = Buffer.from(String(received))
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

async function sendMessage(chatId, text) {
  if (!BOT_TOKEN) return
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  } catch (err) {
    // Gagal membalas tidak boleh menggagalkan transaksi yang sudah tercatat.
    console.error('Telegram sendMessage gagal', { message: err?.message })
  }
}

async function getFileUrl(fileId) {
  if (!BOT_TOKEN) return null
  try {
    const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${encodeURIComponent(fileId)}`)
    const data = await res.json()
    if (!data.ok) return null
    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`
  } catch {
    return null
  }
}

/** Basis URL struk. Dulu di-hardcode ke yandihan-app.vercel.app, jadi struk
 *  selalu menunjuk ke domain itu sekalipun aplikasi dijalankan di tempat lain.
 *  Prioritas: env eksplisit -> domain Vercel -> origin request webhook ini
 *  (Telegram memanggil domain kita sendiri, jadi ini selalu benar). */
function siteOrigin(req) {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  try {
    return new URL(req.url).origin
  } catch {
    return ''
  }
}

/** client_tx_id deterministik dari identitas pesan Telegram. Telegram mengirim
 *  ulang update yang gagal (5xx atau timeout), dan tanpa ini pengiriman ulang
 *  itu tercatat sebagai transaksi kedua. Dengan kolom unik
 *  transactions.client_tx_id, percobaan kedua mengembalikan transaksi yang sama
 *  (temuan C6, jalur Telegram). */
function updateTxId(chatKey, messageId) {
  const hex = createHash('sha256').update(`tg:${chatKey}:${messageId}`).digest('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}

const HELP_TEXT = [
  'Format laporan transaksi (sebut PRODUK, harganya diambil dari daftar produk):',
  '',
  'Satu item:',
  '  2 Nasi Goreng',
  '',
  'Beberapa item:',
  '  2 Nasi Goreng',
  '  1 Es Teh',
  '',
  'Kalau ingin mencatat uang yang diterima, tulis nominalnya di baris pertama:',
  '  100000',
  '  2 Nasi Goreng',
  '  1 Es Teh',
  '',
  'Tanpa baris nominal, pembayaran dianggap uang pas.',
  'Untuk QRIS/Transfer: kirim foto bukti dengan keterangan berformat sama.',
  '',
  'Nama produk harus sama dengan yang ada di dashboard.',
].join('\n')

export async function POST(req) {
  // Gerbang pertama: tanpa secret yang cocok, tidak ada yang diproses.
  if (!secretMatches(req.headers.get('x-telegram-bot-api-secret-token'))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let update
  try {
    update = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const message = update?.message
  const chatId = message?.chat?.id
  if (!message || chatId == null) return NextResponse.json({ ok: true })

  // Kasir manusia tidak mengirim 30 pesan dalam satu menit. Kalau iya, ada yang
  // salah (atau secret-nya bocor) -- balas 200 supaya Telegram tidak retry.
  const rate = await checkRateLimit(`telegram:chat:${chatId}`, { limit: 30, windowSeconds: 60 })
  if (!rate.allowed) return NextResponse.json({ ok: true })

  const chatKey = String(chatId)
  const text = message.text || message.caption || ''
  const photo = message.photo
  const fromName = message.from?.first_name || 'Kasir'

  try {
    const supabase = createServiceClient()

    if (text.startsWith('/start')) {
      await handleStart({ supabase, chatId, chatKey, text, fromName })
      return NextResponse.json({ ok: true })
    }

    if (text.startsWith('/help') || text.startsWith('/bantuan')) {
      await sendMessage(chatId, HELP_TEXT)
      return NextResponse.json({ ok: true })
    }

    // Token kasir dibutuhkan RPC sebagai kredensial. store_id tetap tidak pernah
    // datang dari luar -- RPC menurunkannya sendiri dari token ini.
    const { data: cashier } = await supabase
      .from('cashiers')
      .select('id, store_id, token')
      .eq('telegram_chat_id', chatKey)
      .maybeSingle()

    if (!cashier) {
      await sendMessage(chatId, 'Anda belum terhubung ke toko mana pun. Kirim: /start KODE_TOKO')
      return NextResponse.json({ ok: true })
    }

    // Batas 30 transaksi/hari dihapus: paket GRATIS sekarang tanpa batas
    // transaksi (pembedanya multi-kasir, loyalitas, dan laporan lanjutan).
    // Blok lamanya juga salah hitung -- memakai batas hari UTC padahal
    // penggunanya WIB, dan `count` yang null diperlakukan sebagai "belum penuh".

    const parsed = parseReport(text)
    if (parsed.error) {
      await sendMessage(chatId, `${parsed.error}\n\n${HELP_TEXT}`)
      return NextResponse.json({ ok: true })
    }

    // Nama produk -> product_id. Versi lama hanya menyimpan nama sebagai teks
    // tampilan, jadi laporan Telegram tidak pernah menyentuh stok (C10).
    const resolved = await resolveProducts(supabase, cashier.store_id, parsed.items)
    if (resolved.error) {
      await sendMessage(chatId, resolved.error)
      return NextResponse.json({ ok: true })
    }

    let paymentMethod = 'CASH'
    let receiptUrl = null

    if (photo && photo.length > 0) {
      paymentMethod = 'QRIS/TF'
      const bestPhoto = photo[photo.length - 1]
      const fileUrl = await getFileUrl(bestPhoto.file_id)

      if (fileUrl) {
        const photoRes = await fetch(fileUrl)
        const blob = await photoRes.blob()
        const fileName = `${cashier.store_id}/${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })

        if (uploadError) {
          console.error('Upload bukti Telegram gagal', { message: uploadError.message })
        } else {
          const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName)
          receiptUrl = publicUrlData.publicUrl
        }
      }
    }

    const result = await submitTransactionRpc(supabase, {
      token: cashier.token,
      items: resolved.items,
      paymentMethod,
      // null = uang pas. Kasir Telegram tidak selalu menyebut uang diterima.
      cashReceived: paymentMethod === 'CASH' ? parsed.cash : null,
      clientTxId: updateTxId(chatKey, message.message_id),
      receiptUrl,
    })

    if (result.error) {
      await sendMessage(chatId, result.error)
      return NextResponse.json({ ok: true })
    }

    await sendMessage(chatId, replyFor(result, paymentMethod, siteOrigin(req)))

    return NextResponse.json({ ok: true })
  } catch (error) {
    // Pesan error internal tidak pernah dikirim ke pemanggil.
    console.error('Telegram webhook error', { message: error?.message })
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

/** Balasan sukses: sekarang menyebut rincian yang dihitung server (total,
 *  diskon, kembalian, status) supaya kasir tahu angka yang benar-benar tercatat,
 *  bukan angka yang ia ketik. */
function replyFor(result, paymentMethod, origin) {
  const lines = [
    result.idempotent ? 'Transaksi ini sudah tercatat sebelumnya.' : 'Transaksi berhasil dicatat.',
    result.productName,
  ]
  if (result.discount > 0) {
    lines.push(`Subtotal: ${formatRupiah(result.subtotal)}`)
    lines.push(`Diskon ${result.discountPercent}%: -${formatRupiah(result.discount)}`)
  }
  lines.push(`Total: ${formatRupiah(result.total)}`)
  if (paymentMethod === 'CASH' && result.changeAmount != null) {
    lines.push(`Uang diterima: ${formatRupiah(result.cashReceived)}`)
    lines.push(`Kembalian: ${formatRupiah(result.changeAmount)}`)
  }
  if (result.status === 'pending') lines.push('Status: masuk daftar tunggu.')
  if (origin) lines.push('', 'Lihat/Cetak Struk:', `${origin}/r/${result.transactionId}`)
  return lines.join('\n')
}

async function handleStart({ supabase, chatId, chatKey, text, fromName }) {
  const code = text.split(/\s+/)[1]?.trim().toUpperCase()
  if (!code) {
    await sendMessage(chatId, 'Format salah. Gunakan: /start KODE_TOKO')
    return
  }

  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .select('id, name, subscription_tier, subscription_end_date')
    .eq('unique_code', code)
    .maybeSingle()

  if (storeErr || !store) {
    await sendMessage(chatId, 'Toko tidak ditemukan. Periksa kembali kode unik toko.')
    return
  }

  // Kalau chat ini sudah jadi kasir toko yang sama, ini pendaftaran ulang dan
  // jumlah kasir tidak bertambah -- kuota tidak perlu diperiksa.
  const { data: existing } = await supabase
    .from('cashiers')
    .select('id, store_id')
    .eq('telegram_chat_id', chatKey)
    .maybeSingle()

  if (existing?.store_id !== store.id) {
    const limit = maxCashiers(store)
    if (Number.isFinite(limit)) {
      // Dulu: .neq('telegram_chat_id', chatId). Kasir web punya
      // telegram_chat_id NULL, dan NULL <> apa pun tidak pernah TRUE, jadi
      // semua kasir web tidak terhitung -- toko GRATIS bisa punya 1 kasir web
      // PLUS 1 kasir Telegram (temuan C7). Sekarang dihitung semuanya.
      const { count, error: countErr } = await supabase
        .from('cashiers')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)

      // count null (query gagal) dulu berarti kuota tak terbatas. Sekarang tolak.
      if (countErr || count == null) {
        await sendMessage(chatId, 'Gagal memeriksa kuota kasir. Coba lagi sebentar.')
        return
      }
      if (count >= limit) {
        await sendMessage(
          chatId,
          `Batas kasir paket ${planTier(store)} (${limit} kasir) sudah tercapai. Minta pemilik toko upgrade ke PRO.`
        )
        return
      }
    }
  }

  const { error } = await supabase
    .from('cashiers')
    .upsert(
      { store_id: store.id, telegram_chat_id: chatKey, name: fromName },
      { onConflict: 'telegram_chat_id' }
    )

  if (error) {
    console.error('Registrasi kasir Telegram gagal', { code: error.code })
    await sendMessage(chatId, 'Terjadi kesalahan sistem saat mendaftar. Coba lagi.')
    return
  }

  await sendMessage(chatId, `Berhasil terhubung ke toko: ${store.name}\n\n${HELP_TEXT}`)
}

/**
 * Memparsing pesan laporan jadi { items: [{ qty, name }], cash } atau { error }.
 *
 * Perbedaan dari versi lama: nominal BUKAN lagi sumber uang. Harga dihitung
 * server dari products.price (temuan C1), jadi angka di baris pertama kini
 * dibaca sebagai "uang yang diterima" dan boleh dikosongkan.
 */
function parseReport(text) {
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return { error: 'Pesan kosong.' }

  let cash = null
  let itemLines = lines

  if (lines.length > 1 && /^\d+$/.test(lines[0])) {
    cash = Number.parseInt(lines[0], 10)
    itemLines = lines.slice(1)
  } else if (lines.length === 1) {
    // Kompatibilitas format lama satu baris: "<nominal> <jumlah> <nama produk>".
    const three = lines[0].match(/^(\d+)\s+(\d+)\s+(.+)$/)
    if (three) {
      cash = Number.parseInt(three[1], 10)
      itemLines = [`${three[2]} ${three[3]}`]
    }
  }

  if (itemLines.length === 0) return { error: 'Belum ada produk yang disebutkan.' }
  if (itemLines.length > MAX_LINES) return { error: `Maksimal ${MAX_LINES} baris item.` }

  const items = []
  for (const line of itemLines) {
    const match = line.match(/^(\d+)\s+(.+)$/)
    const qty = match ? Number.parseInt(match[1], 10) : 1
    const name = (match ? match[2] : line).trim()

    if (!name) return { error: `Baris "${line}" tidak menyebut nama produk.` }
    if (!(qty >= 1 && qty <= MAX_QTY)) {
      return { error: `Jumlah pada baris "${line}" harus antara 1 dan ${MAX_QTY}.` }
    }
    items.push({ qty, name })
  }

  return { items, cash }
}

/** Cocokkan nama produk (tanpa peduli huruf besar/kecil) ke product_id milik
 *  toko ini. Nama yang tidak dikenal ditolak dengan daftar produk yang ada --
 *  dulu nama apa pun diterima dan disimpan sebagai teks. */
async function resolveProducts(supabase, storeId, items) {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name')
    .eq('store_id', storeId)
    .limit(1000)

  if (error) return { error: 'Gagal memuat daftar produk. Coba lagi.' }
  if (!products || products.length === 0) {
    return { error: 'Toko ini belum punya produk. Tambahkan produk dulu di dashboard.' }
  }

  const byName = new Map(products.map((p) => [String(p.name).trim().toLowerCase(), p]))
  const resolved = []
  const unknown = []

  for (const item of items) {
    const product = byName.get(item.name.toLowerCase())
    if (product) resolved.push({ product_id: product.id, qty: item.qty, subs: [] })
    else unknown.push(item.name)
  }

  if (unknown.length > 0) {
    const available = products.slice(0, 20).map((p) => `- ${p.name}`).join('\n')
    const more = products.length > 20 ? `\n(dan ${products.length - 20} produk lain)` : ''
    return {
      error: `Produk tidak dikenal: ${unknown.join(', ')}.\n\nProduk yang tersedia:\n${available}${more}`,
    }
  }

  return { items: resolved }
}
