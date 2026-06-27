import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { orderId, storeId } = await req.json()

    if (!orderId || !storeId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Verify user session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check order status directly from Midtrans
    const authString = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString('base64')
    const statusRes = await fetch(`https://api.sandbox.midtrans.com/v2/${orderId}/status`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`
      }
    })

    const statusData = await statusRes.json()
    console.log('Midtrans status check:', orderId, statusData.transaction_status)

    const isPaid = statusData.transaction_status === 'settlement' ||
      (statusData.transaction_status === 'capture' && statusData.fraud_status === 'accept')

    if (!isPaid) {
      return NextResponse.json({ 
        paid: false, 
        status: statusData.transaction_status 
      })
    }

    // Payment confirmed — upgrade store
    const serviceSupabase = createServiceClient()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 30)

    const { error } = await serviceSupabase
      .from('stores')
      .update({
        subscription_tier: 'PRO',
        subscription_end_date: endDate.toISOString()
      })
      .eq('id', storeId)
      .eq('user_id', user.id) // ownership check

    if (error) {
      console.error('Failed to upgrade via verify:', error)
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
    }

    console.log(`Store ${storeId} upgraded to PRO via manual verify. Expires: ${endDate.toISOString()}`)
    return NextResponse.json({ paid: true, expiresAt: endDate.toISOString() })

  } catch (error) {
    console.error('Verify Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
