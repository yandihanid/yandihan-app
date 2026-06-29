import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`

async function sendMessage(chatId, text) {
  if (!BOT_TOKEN) return; // Skip if dev no token
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

async function getFileUrl(fileId) {
  if (!BOT_TOKEN) return null;
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`)
  const data = await res.json()
  if (!data.ok) return null;
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`
}

export async function POST(req) {
  try {
    const update = await req.json()
    const message = update.message

    if (!message) return NextResponse.json({ ok: true })

    const chatId = message.chat.id
    const text = message.text || message.caption || ''
    const photo = message.photo
    const fromName = message.from.first_name || 'Kasir'

    const supabase = createServiceClient()

    // Handle /start command
    if (text.startsWith('/start')) {
      const parts = text.split(' ')
      if (parts.length < 2) {
        await sendMessage(chatId, 'Format salah. Gunakan: /start KODE_TOKO')
        return NextResponse.json({ ok: true })
      }
      const code = parts[1]

      // Find store
      const { data: store } = await supabase
        .from('stores')
        .select('id, name, subscription_tier')
        .eq('unique_code', code)
        .single()

      if (!store) {
        await sendMessage(chatId, 'Toko tidak ditemukan. Periksa kembali kode unik.')
        return NextResponse.json({ ok: true })
      }

      // Check Free Tier Cashier Limit
      if (store.subscription_tier === 'FREE') {
        const { count } = await supabase
          .from('cashiers')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .neq('telegram_chat_id', chatId) // don't count if they are just re-registering

        if (count >= 1) {
          await sendMessage(chatId, '❌ Batas maksimal kasir (1 Kasir/Weblink) untuk paket GRATIS telah tercapai. Minta owner toko untuk upgrade ke PRO.')
          return NextResponse.json({ ok: true })
        }
      }

      // Upsert cashier
      const { error } = await supabase
        .from('cashiers')
        .upsert({ 
          store_id: store.id, 
          telegram_chat_id: chatId,
          name: fromName 
        }, { onConflict: 'telegram_chat_id' })

      if (error) {
        console.error(error)
        await sendMessage(chatId, 'Terjadi kesalahan sistem saat mendaftar.')
      } else {
        await sendMessage(chatId, `✅ Berhasil terhubung ke toko: *${store.name}*\n\nMulai laporkan transaksi dengan format:\n\n*Single item:*\n\`<nominal> <jumlah> <nama_produk>\`\nContoh: \`50000 2 Nasi Goreng\`\n\n*Multi-item:*\n\`<total_nominal>\`\n\`<jumlah> <nama_produk_1>\`\n\`<jumlah> <nama_produk_2>\`\nContoh:\n\`65000\`\n\`2 Nasi Goreng\`\n\`1 Es Teh\`\n\nUntuk QRIS/Transfer, kirimkan foto bukti dengan caption/keterangan yang sama.`)
      }
      return NextResponse.json({ ok: true })
    }

    // Check if cashier is registered and fetch store info
    const { data: cashier } = await supabase
      .from('cashiers')
      .select('id, store_id, stores(id, subscription_tier)')
      .eq('telegram_chat_id', chatId)
      .single()

    if (!cashier) {
      await sendMessage(chatId, 'Anda belum terhubung ke toko mana pun. Kirim /start KODE_TOKO')
      return NextResponse.json({ ok: true })
    }

    // Check Free Tier Limits (Max 40 transactions/day)
    if (cashier.stores.subscription_tier === 'FREE') {
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', cashier.store_id)
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`)

      if (count >= 30) {
        await sendMessage(chatId, '❌ Batas transaksi harian paket GRATIS (30 transaksi) telah tercapai. Minta owner toko untuk upgrade ke PRO.')
        return NextResponse.json({ ok: true })
      }
    }

    // Parse transaction
    let amount = 0
    let productName = ''

    const lines = text.trim().split('\n').filter(l => l.trim() !== '')

    if (lines.length === 0) {
      await sendMessage(chatId, '❌ Pesan kosong. Kirimkan nominal dan nama produk.')
      return NextResponse.json({ ok: true })
    }

    if (lines.length === 1) {
      // Format: <nominal> <kuantitas> <produk> ATAU <nominal> <produk>
      const match = lines[0].trim().match(/^(\d+)\s+(.+)$/)
      if (!match) {
        await sendMessage(chatId, '❌ Format salah.\nGunakan:\n`<nominal> <jumlah> <nama_produk>`\nContoh:\n`50000 2 Nasi Goreng`\n\nUntuk multi-item:\n`<total_nominal>`\n`<jumlah> <nama_produk_1>`\n`<jumlah> <nama_produk_2>`\nContoh:\n`65000`\n`2 Nasi Goreng`\n`1 Es Teh`')
        return NextResponse.json({ ok: true })
      }
      amount = parseInt(match[1], 10)
      
      // Ensure productName always starts with a quantity prefix
      const prodDescription = match[2].trim()
      const prodParts = prodDescription.match(/^(\d+)\s+(.+)$/)
      if (prodParts) {
        productName = `${prodParts[1]}x ${prodParts[2]}`
      } else {
        productName = `1x ${prodDescription}`
      }
    } else {
      // Format multi-line:
      // <total_nominal>
      // <kuantitas> <produk 1>
      // <kuantitas> <produk 2>
      const firstLine = lines[0].trim()
      if (!/^\d+$/.test(firstLine)) {
        await sendMessage(chatId, '❌ Format salah untuk multi-item.\nBaris pertama harus total nominal (angka saja).\nContoh:\n`65000`\n`2 Nasi Goreng`\n`1 Es Teh`')
        return NextResponse.json({ ok: true })
      }
      amount = parseInt(firstLine, 10)

      const items = []
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        const prodParts = line.match(/^(\d+)\s+(.+)$/)
        if (prodParts) {
          items.push(`${prodParts[1]}x ${prodParts[2]}`)
        } else {
          items.push(`1x ${line}`) // Default to 1x if quantity is missing
        }
      }
      productName = items.join(', ')
    }

    let paymentMethod = 'CASH'
    let receiptUrl = null

    // If there is a photo, it is QRIS/TF
    if (photo && photo.length > 0) {
      paymentMethod = 'QRIS/TF'
      // Get the highest resolution photo
      const bestPhoto = photo[photo.length - 1]
      const fileUrl = await getFileUrl(bestPhoto.file_id)

      if (fileUrl) {
        // Download photo
        const photoRes = await fetch(fileUrl)
        const blob = await photoRes.blob()

        // Upload to Supabase Storage
        const fileName = `${cashier.store_id}/${Date.now()}.jpg`
        const { error: uploadError } = await supabase
          .storage
          .from('receipts')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false
          })

        if (!uploadError) {
          const { data: publicUrlData } = supabase
            .storage
            .from('receipts')
            .getPublicUrl(fileName)
          
          receiptUrl = publicUrlData.publicUrl
        } else {
          console.error("Upload error:", uploadError)
        }
      }
    }

    // Insert transaction
    const { data: insertData, error: insertError } = await supabase
      .from('transactions')
      .insert({
        store_id: cashier.store_id,
        cashier_id: cashier.id,
        amount,
        product_name: productName,
        payment_method: paymentMethod,
        receipt_url: receiptUrl
      })
      .select()
      .single()

    if (insertError) {
      console.error(insertError)
      await sendMessage(chatId, 'Terjadi kesalahan sistem saat mencatat transaksi.')
    } else {
      await sendMessage(chatId, `✅ Transaksi berhasil dicatat!\n\nLihat/Cetak Struk:\nhttps://yandihan-app.vercel.app/r/${insertData.id}`)
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
