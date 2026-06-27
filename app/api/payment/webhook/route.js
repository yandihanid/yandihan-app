import { createServiceClient } from '@/utils/supabase/service';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();

    // Pastikan status transaksinya berhasil (settlement atau capture)
    if (body.transaction_status === 'settlement' || body.transaction_status === 'capture') {

      // 👇 Ambil store_id asli yang kita titipkan di metadata tadi!
      const storeIdAsli = body.metadata?.store_id;

      if (!storeIdAsli) {
        return NextResponse.json({ error: 'Store ID tidak ditemukan di metadata' }, { status: 400 });
      }

      const serviceSupabase = createServiceClient();

      // Update status toko langsung jadi PRO secara otomatis di Supabase
      const { error } = await serviceSupabase
        .from('stores')
        .update({ status: 'PRO' }) // sesuaikan nama kolom status pro di tabelmu
        .eq('id', storeIdAsli);

      if (error) {
        console.error('Gagal update status toko:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
