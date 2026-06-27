import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'

export async function POST(req) {
  try {
    const notification = await req.json()
    const { order_id, transaction_status, fraud_status } = notification
    
    console.log("Midtrans webhook received:", order_id, transaction_status)

    // Ensure this is an order we track (e.g. PRO-<store_id>-<timestamp>)
    if (!order_id || !order_id.startsWith('PRO-')) {
      return NextResponse.json({ ok: true }) // ignore
    }

    const storeId = order_id.split('-')[1]

    if (!storeId) {
      return NextResponse.json({ ok: true })
    }

    let isSuccess = false
    
    if (transaction_status == 'capture') {
      if (fraud_status == 'accept') {
        isSuccess = true
      }
    } else if (transaction_status == 'settlement') {
      isSuccess = true
    } else if (transaction_status == 'cancel' || transaction_status == 'deny' || transaction_status == 'expire') {
      isSuccess = false
    } else if (transaction_status == 'pending') {
      isSuccess = false
    }

    if (isSuccess) {
      const supabase = createServiceClient()
      
      // Update store to PRO tier
      const { error } = await supabase
        .from('stores')
        .update({ subscription_tier: 'PRO' })
        .eq('id', storeId)
        
      if (error) {
        console.error("Failed to upgrade store to PRO:", error)
        return NextResponse.json({ error: 'Failed to update store' }, { status: 500 })
      }
      
      console.log(`Store ${storeId} upgraded to PRO via Midtrans webhook.`)
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
