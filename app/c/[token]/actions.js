'use server'

import { createServiceClient } from '@/utils/supabase/service'

function normalizePhone(phone) {
  if (!phone) return null
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('62')) cleaned = '0' + cleaned.slice(2)
  else if (cleaned.length && !cleaned.startsWith('0')) cleaned = '0' + cleaned
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
    const buyerName = formData.get('buyerName') || null

    // Validation
    if (!cashierId || !storeId || !token) {
      return { error: 'Data tidak lengkap' }
    }

    const supabase = createServiceClient()

    // Verify cashier belongs to store
    const { data: cashier, error: cashierErr } = await supabase
      .from('cashiers')
      .select('id, stores(id, subscription_tier)')
      .eq('token', token)
      .eq('id', cashierId)
      .single()

    if (cashierErr || !cashier) throw new Error('Unauthorized')

    // Check daily limit for FREE tier
    if (cashier.stores.subscription_tier === 'FREE') {
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`)
      if (count >= 30) throw new Error('Batas transaksi harian GRATIS (30) tercapai.')
    }

    // Parse items and check stock
    const items = productName.split(', ').map((s) => {
      const m = s.match(/^(\d+)x\s+(.+)$/)
      return m ? { qty: +m[1], name: m[2].trim() } : null
    }).filter(Boolean)

    for (const item of items) {
      const { data: product, error: prodErr } = await supabase
        .from('products')
        .select('id, name, stock')
        .eq('store_id', storeId)
        .eq('name', item.name)
        .single()
      if (!prodErr && product) {
        if (product.stock < item.qty) throw new Error(`Stok "${product.name}" tidak cukup.`)
        const { error: updErr } = await supabase
          .from('products')
          .update({ stock: product.stock - item.qty })
          .eq('id', product.id)
        if (updErr) throw new Error(`Gagal update stok "${product.name}".`)
      }
    }

    // Handle receipt upload
    let receiptUrl = null
    if (receiptFile && paymentMethod === 'QRIS/TF') {
      const buffer = Buffer.from(await receiptFile.arrayBuffer())
      const fileName = `${storeId}/${Date.now()}-${receiptFile.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
      const { error: upErr } = await supabase.storage.from('receipts').upload(fileName, buffer, { contentType: receiptFile.type })
      if (upErr) throw new Error('Gagal unggah bukti.')
      receiptUrl = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl
    }

    // Insert transaction
    const { data: inserted, error: insErr } = await supabase
      .from('transactions')
      .insert({
        store_id: storeId,
        cashier_id: cashierId,
        amount: +amount,
        original_amount: originalAmount ? +originalAmount : +amount,
        discount_percent: discountPercent,
        customer_name: customerName,
        customer_phone: customerPhone,
        buyer_name: buyerName,
        product_name: productName,
        payment_method: paymentMethod,
        receipt_url: receiptUrl,
        cash_received: paymentMethod === 'CASH' ? +cashReceived : null,
        change_amount: paymentMethod === 'CASH' ? +changeAmount : null,
        status: 'pending',
      })
      .select()
      .single()

    if (insErr) throw new Error('Gagal catat transaksi.')

    // Update customer total spent
    if (customerPhone) {
      const { data: cust } = await supabase
        .from('customers')
        .select('id, total_spent')
        .eq('store_id', storeId)
        .eq('phone', customerPhone)
        .single()
      if (cust) {
        await supabase.from('customers').update({ total_spent: (cust.total_spent || 0) + +amount }).eq('id', cust.id)
      }
    }

    return { success: true, transactionId: inserted.id }
  } catch (error) {
    return { error: error.message }
  }
}
