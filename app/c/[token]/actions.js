'use server'

import { createServiceClient } from '@/utils/supabase/service'

function normalizePhone(phone) {
  if (!phone) return null
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.slice(2)
  } else if (cleaned.length > 0 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned
  }
  return cleaned || null
}

export async function submitTransaction(formData) {
  try {
    const cashierId = formData.get('cashierId')
    const storeId = formData.get('storeId')
    const token = formData.get('token')
    const amount = formData.get('amount')
    const originalAmount = formData.get('originalAmount')
    const discountPercent = parseInt(formData.get('discountPercent') || '0', 10)
    const customerName = formData.get('customerName') || null
    const customerPhone = normalizePhone(formData.get('customerPhone'))
    const productName = formData.get('productName')
    const paymentMethod = formData.get('paymentMethod')
    const receiptFile = formData.get('receipt')
    const cashReceived = formData.get('cashReceived')
    const changeAmount = formData.get('changeAmount')

    const supabase = createServiceClient()

    // Verify token matches cashier and fetch store subscription
    const { data: cashier } = await supabase
      .from('cashiers')
      .select('id, stores(id, subscription_tier)')
      .eq('token', token)
      .eq('id', cashierId)
      .single()

    if (!cashier) throw new Error("Unauthorized")

    // Check Free Tier Limits (Max 40 transactions/day)
    if (cashier.stores.subscription_tier === 'FREE') {
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`)

      if (count >= 30) {
        throw new Error("Batas transaksi harian paket GRATIS (30 transaksi) telah tercapai. Silakan upgrade ke PRO.")
      }
    }

    // Parse items to check and update stock
    // Format productName: "2x Nasi Goreng, 1x Es Teh"
    const itemsToProcess = productName.split(', ').map(itemStr => {
      const match = itemStr.match(/^(\d+)x\s+(.+)$/)
      if (match) {
        return { qty: parseInt(match[1], 10), name: match[2].trim() }
      }
      return null
    }).filter(Boolean)

    // Verify and deduct stock for each product
    for (const item of itemsToProcess) {
      const { data: product, error: prodError } = await supabase
        .from('products')
        .select('id, name, stock')
        .eq('store_id', storeId)
        .eq('name', item.name)
        .single()

      if (!prodError && product) {
        if (product.stock < item.qty) {
          throw new Error(`Stok untuk "${product.name}" tidak mencukupi (Sisa: ${product.stock}).`)
        }

        // Deduct stock
        const { error: updateStockError } = await supabase
          .from('products')
          .update({ stock: product.stock - item.qty })
          .eq('id', product.id)

        if (updateStockError) {
          console.error("Update Stock Error:", updateStockError)
          throw new Error(`Gagal memperbarui stok untuk "${product.name}".`)
        }
      }
    }

    let receiptUrl = null

    if (receiptFile && paymentMethod === 'QRIS/TF') {
      const bytes = await receiptFile.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const fileName = `${storeId}/${Date.now()}-${receiptFile.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
      
      const { error: uploadError } = await supabase
        .storage
        .from('receipts')
        .upload(fileName, buffer, {
          contentType: receiptFile.type,
          upsert: false
        })

      if (uploadError) {
        console.error("Upload Error:", uploadError)
        throw new Error("Gagal mengunggah foto bukti.")
      }

      const { data: publicUrlData } = supabase
        .storage
        .from('receipts')
        .getPublicUrl(fileName)
      
      receiptUrl = publicUrlData.publicUrl
    }

    const { data: insertData, error: insertError } = await supabase
      .from('transactions')
      .insert({
        store_id: storeId,
        cashier_id: cashierId,
        amount: parseInt(amount, 10),
        original_amount: originalAmount ? parseInt(originalAmount, 10) : parseInt(amount, 10),
        discount_percent: discountPercent,
        customer_name: customerName,
        customer_phone: customerPhone,
        product_name: productName,
        payment_method: paymentMethod,
        receipt_url: receiptUrl,
        cash_received: paymentMethod === 'CASH' ? parseInt(cashReceived, 10) : null,
        change_amount: paymentMethod === 'CASH' ? parseInt(changeAmount, 10) : null,
      })
      .select()
      .single()

    // Update total_spent pelanggan jika ada customer data
    if (!insertError && customerPhone && storeId) {
      try {
        const { data: existingCust } = await supabase
          .from('customers')
          .select('id, total_spent')
          .eq('store_id', storeId)
          .eq('phone', customerPhone)
          .single()

        if (existingCust) {
          await supabase
            .from('customers')
            .update({
              total_spent: (existingCust.total_spent || 0) + parseInt(amount, 10),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingCust.id)
        }
      } catch { /* non-critical, ignore */ }
    }

    if (insertError) {
      console.error("Insert Error:", insertError)
      throw new Error("Gagal mencatat transaksi.")
    }

    return { success: true, transactionId: insertData.id }
  } catch (error) {
    console.error("Action error:", error)
    return { error: error.message }
  }
}
