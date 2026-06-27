import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { storeId } = await req.json()
    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceClient()

    // Get Store details
    const { data: store, error: storeError } = await serviceSupabase
      .from('stores')
      .select('id, user_id')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Verify ownership
    if (store.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use timestamp as unique suffix. storeId is a UUID (36 chars), keep it intact.
    // Format: PRO__<storeId>__<timestamp>
    // 1. Buat orderId yang pendek & unik (Sangat aman dari limit 50 karakter)
    const timestamp = Date.now();
    const orderId = `PRO-${timestamp}`;
    const grossAmount = 189000;

    // Request to Midtrans Snap API
    const authString = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString('base64');
    
    // 2. Kirim ke Midtrans beserta data TITIPAN (metadata)
    const midtransRes = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: grossAmount
        },
        // 👇 TITIPKAN STORE ID ASLI DI SINI (Otomatis dikirim balik oleh Midtrans)
        metadata: {
          store_id: storeId
        }
      })
    });

    const midtransData = await midtransRes.json()

    if (!midtransRes.ok) {
      console.error('Midtrans Error:', midtransData)
      return NextResponse.json({ error: 'Payment gateway error: ' + JSON.stringify(midtransData) }, { status: 500 })
    }

    return NextResponse.json({ token: midtransData.token, orderId })

  } catch (error) {
    console.error('Payment Error:', error)
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 })
  }
}
