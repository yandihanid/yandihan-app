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
        .select('id, name')
        .eq('unique_code', code)
        .single()

      if (!store) {
        await sendMessage(chatId, 'Toko tidak ditemukan. Periksa kembali kode unik.')
        return NextResponse.json({ ok: true })
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
        await sendMessage(chatId, `✅ Berhasil terhubung ke toko: *${store.name}*\n\nMulai laporkan transaksi dengan mengetik:\n<nominal> <produk>\nContoh: 50000 Nasi Goreng\n\nUntuk QRIS/Transfer, kirimkan foto bukti dengan caption/keterangan yang sama.`)
      }
      return NextResponse.json({ ok: true })
    }

    // Check if cashier is registered
    const { data: cashier } = await supabase
      .from('cashiers')
      .select('id, store_id')
      .eq('telegram_chat_id', chatId)
      .single()

    if (!cashier) {
      await sendMessage(chatId, 'Anda belum terhubung ke toko mana pun. Kirim /start KODE_TOKO')
      return NextResponse.json({ ok: true })
    }

    // Parse transaction
    let amount = 0
    let productName = ''

    const lines = text.trim().split('\n').filter(l => l.trim() !== '')

    if (lines.length === 1) {
      // Format: 50000 2 Nasi Goreng OR 50000 Nasi Goreng
      const match = lines[0].trim().match(/^(\d+)\s+(.+)$/)
      if (!match) {
        await sendMessage(chatId, '❌ Format salah.\nGunakan: <nominal> <kuantitas> <produk>\nContoh: 50000 2 Nasi Goreng')
        return NextResponse.json({ ok: true })
      }
      amount = parseInt(match[1], 10)
      
      const prodParts = match[2].trim().match(/^(\d+)\s+(.+)$/)
      if (prodParts) {
        productName = `${prodParts[1]}x ${prodParts[2]}`
      } else {
        productName = `1x ${match[2].trim()}`
      }
    } else {
      // Format multi-line:
      // 65000
      // 2 Nasi Goreng
      // 1 Es Teh
      const firstLine = lines[0].trim()
      if (!/^\d+$/.test(firstLine)) {
        await sendMessage(chatId, '❌ Format salah.\nBaris pertama harus total nominal (angka saja).\nContoh:\n65000\n2 Nasi Goreng\n1 Es Teh')
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
          items.push(`1x ${line}`)
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
