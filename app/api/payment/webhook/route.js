import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'

export async function POST(req) {
  try {
    const notification = await req.json()
    const { order_id, transaction_status, fraud_status } = notification
    
    console.log("Midtrans webhook received:", order_id, transaction_status)

    // New format: PRO__<storeId>__<timestamp>
    if (!order_id || !order_id.startsWith('PRO__')) {
      return NextResponse.json({ ok: true })
    }

    // Extract storeId: split by '__' → ['PRO', storeId, timestamp]
    const parts = order_id.split('__')
    const storeId = parts[1]

    if (!storeId) {
      console.error("Could not extract storeId from order_id:", order_id)
      return NextResponse.json({ ok: true })
    }

    let isSuccess = false
    
    if (transaction_status === 'capture' && fraud_status === 'accept') {
      isSuccess = true
    } else if (transaction_status === 'settlement') {
      isSuccess = true
    }

    if (isSuccess) {
      const supabase = createServiceClient()
      
      // Set PRO end date to 30 days from now
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)

      const { error } = await supabase
        .from('stores')
        .update({ 
          subscription_tier: 'PRO',
          subscription_end_date: endDate.toISOString()
        })
        .eq('id', storeId)
        
      if (error) {
        console.error("Failed to upgrade store to PRO:", error)
        return NextResponse.json({ error: 'Failed to update store' }, { status: 500 })
      }
      
      console.log(`Store ${storeId} upgraded to PRO until ${endDate.toISOString()}`)
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
