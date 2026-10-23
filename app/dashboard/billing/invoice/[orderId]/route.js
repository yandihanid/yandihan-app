import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireUser } from '@/lib/dal'
import { formatRupiah } from '@/lib/format'
import { TAX_INFO, LEGAL_ENTITY, BUSINESS_ADDRESS, PAYMENT_GATEWAY } from '@/lib/site'
import { isXenditProduction } from '@/lib/xendit'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  try {
    const { orderId } = await params
    if (!orderId) {
      return new NextResponse('Order ID tidak valid', { status: 400 })
    }

    const { user, error: authErr } = await requireUser()
    if (authErr) {
      return new NextResponse('Sesi tidak valid. Silakan login kembali.', { status: 401 })
    }

    const supabase = await createClient()
    const { data: order } = await supabase
      .from('subscription_orders')
      .select('order_id, amount, plan, status, consumed_at, created_at, stores(name, address, phone)')
      .eq('order_id', orderId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!order) {
      return new NextResponse('Order tidak ditemukan', { status: 404 })
    }

    const isPaid = order.status === 'paid'
    const planName =
      order.plan === 'PRO_ANNUAL' || Number(order.amount) >= 700000
        ? 'Paket Yandihan PRO (1 Tahun / Tahunan)'
        : 'Paket Yandihan PRO (1 Bulan / Bulanan)'

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice - ${order.order_id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 2rem 1rem; }
    .invoice-card { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 2.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 1.5rem; margin-bottom: 1.5rem; }
    .brand { font-size: 1.5rem; font-weight: 800; color: #0284c7; }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 99px; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .section-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 0.5rem; letter-spacing: 0.05em; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
    .info-p { font-size: 0.9rem; line-height: 1.5; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
    th { text-align: left; padding: 0.75rem 0; border-bottom: 2px solid #e2e8f0; font-size: 0.85rem; color: #475569; }
    td { padding: 1rem 0; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; }
    .total-row { display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 800; padding-top: 1rem; border-top: 2px solid #e2e8f0; }
    .tax-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-top: 2rem; font-size: 0.8rem; color: #475569; line-height: 1.6; }
    .print-bar { max-width: 680px; margin: 0 auto 1rem; display: flex; justify-content: space-between; align-items: center; }
    .btn { background: #0284c7; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; text-decoration: none; font-size: 0.875rem; }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 0; width: 100%; max-width: 100%; }
      .print-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <a href="/dashboard/billing" class="btn" style="background: #e2e8f0; color: #334155;">&larr; Kembali ke Dashboard</a>
    <button onclick="window.print()" class="btn">🖨️ Cetak / Unduh PDF</button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand">Yandihan.</div>
        <p class="info-p" style="font-size: 0.85rem; color: #64748b;">${LEGAL_ENTITY}</p>
        <p class="info-p" style="font-size: 0.85rem; color: #64748b;">${BUSINESS_ADDRESS}</p>
      </div>
      <div style="text-align: right;">
        <span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">
          ${isPaid ? 'LUNAS' : 'MENUNGGU PEMBAYARAN'}
        </span>
        <p style="font-family: monospace; font-size: 0.9rem; margin-top: 0.5rem; font-weight: 700;">${order.order_id}</p>
        <p style="font-size: 0.8rem; color: #64748b; margin-top: 0.25rem;">
          Tanggal: ${new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>

    <div class="grid-2">
      <div>
        <div class="section-title">Ditagihkan Kepada:</div>
        <p class="info-p" style="font-weight: 700;">${order.stores?.name || 'Toko Pelanggan'}</p>
        <p class="info-p">${user.email}</p>
        ${order.stores?.phone ? `<p class="info-p">${order.stores.phone}</p>` : ''}
      </div>
      <div>
        <div class="section-title">Metode Pembayaran:</div>
        <p class="info-p">Payment Gateway Resmi (Xendit)</p>
        ${isPaid && order.consumed_at ? `<p class="info-p" style="color: #15803d; font-size: 0.85rem;">Dikonfirmasi lunas pada: ${new Date(order.consumed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Deskripsi Layanan</th>
          <th style="text-align: center; width: 80px;">Durasi</th>
          <th style="text-align: right; width: 140px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${planName}</strong>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 0.25rem;">
              Fitur kasir tanpa batas, loyalty poin, analitik lanjutan, dan multi-perangkat.
            </div>
          </td>
          <td style="text-align: center;">${order.plan === 'PRO_ANNUAL' || Number(order.amount) >= 700000 ? '1 Tahun' : '30 Hari'}</td>
          <td style="text-align: right; font-weight: 600;">${formatRupiah(order.amount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-row">
      <span>Total Tagihan:</span>
      <span style="color: #0284c7;">${formatRupiah(order.amount)}</span>
    </div>

    <div class="tax-box">
      <strong>Informasi Wajib Pajak & PP 55/2022:</strong><br />
      Wajib Pajak: <strong>${TAX_INFO.taxpayerName}</strong> | NPWP: <strong>${TAX_INFO.npwp}</strong><br />
      Surat Keterangan: <strong>${TAX_INFO.suketNumber}</strong> (${TAX_INFO.regulation})<br />
      KPP Terdaftar: ${TAX_INFO.kpp} • Tarif: ${TAX_INFO.taxRate}<br />
      <em>Dokumen ini merupakan bukti tagihan dan pembayaran yang sah sesuai ketentuan perpajakan Republik Indonesia.</em>
    </div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Invoice generation error:', error)
    return new NextResponse('Terjadi kesalahan membuat invoice.', { status: 500 })
  }
}
