'use server'

import { createServiceClient } from '@/utils/supabase/service'

export async function submitTransaction(formData) {
  try {
    const cashierId = formData.get('cashierId')
    const storeId = formData.get('storeId')
    const token = formData.get('token')
    const amount = formData.get('amount')
    const productName = formData.get('productName')
    const paymentMethod = formData.get('paymentMethod')
    const receiptFile = formData.get('receipt')

    const supabase = createServiceClient()

    // Verify token matches cashier
    const { data: cashier } = await supabase
      .from('cashiers')
      .select('id')
      .eq('token', token)
      .eq('id', cashierId)
      .single()

    if (!cashier) throw new Error("Unauthorized")

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
        product_name: productName,
        payment_method: paymentMethod,
        receipt_url: receiptUrl
      })
      .select()
      .single()

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
