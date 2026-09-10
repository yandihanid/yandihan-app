import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { verifySession, getMyStore } from '@/lib/dal'
import { isPro, planTier } from '@/lib/plan'
import { wibDateString, wibDayRange, wibLabel, wibMonthRange } from '@/lib/time'
import { formatRupiah } from '@/lib/format'

export const dynamic = 'force-dynamic'

const PAYMENT_FILTERS = new Set(['ALL', 'CASH', 'QRIS/TF'])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000

function defaultDates() {
  const [year, month] = wibDateString().split('-')
  const range = wibMonthRange(year, month)
  return { from: wibDateString(range.start), to: wibDateString(new Date(new Date(range.end).getTime() - DAY_MS)) }
}

function isValidWibDate(value) {
  if (!DATE_RE.test(value || '')) return false
  const date = new Date(`${value}T00:00:00+07:00`)
  return Number.isFinite(date.getTime()) && wibDateString(date) === value
}

function parseDates(params) {
  const fallback = defaultDates()
  const from = isValidWibDate(params.from) ? params.from : fallback.from
  const to = isValidWibDate(params.to) ? params.to : fallback.to
  if (from > to) return fallback
  return { from, to }
}

function reportHref(filter, dates) {
  return `/dashboard/laporan?filter=${encodeURIComponent(filter)}&from=${dates.from}&to=${dates.to}`
}

function pillStyle(active) {
  return {
    padding: '0.5rem 0.8rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '600',
    backgroundColor: active ? 'white' : 'transparent', color: active ? 'var(--text-main)' : 'var(--text-muted)',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
  }
}

function ErrorNotice({ error }) {
  if (!error) return null
  const missingMigration = error.code === 'PGRST202' || /report_.*(function|schema cache)/i.test(error.message || '')
  return (
    <div role="alert" style={{ padding: '1rem', border: '1px solid var(--danger-border)', borderRadius: '8px', background: 'var(--danger-light)', color: 'var(--danger-dark)' }}>
      <strong>Laporan belum dapat dimuat.</strong>{' '}
      {missingMigration ? 'Migrasi laporan belum terpasang. Jalankan migrasi 0006_report_rpcs.sql lalu muat ulang halaman.' : 'Terjadi kesalahan saat mengambil agregat laporan. Silakan muat ulang atau coba rentang lain.'}
    </div>
  )
}

function Stat({ label, value, hint }) {
  return (
    <div className="card" style={{ padding: '1.25rem', minWidth: 0 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem', overflowWrap: 'anywhere' }}>{value}</p>
      {hint && <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{hint}</p>}
    </div>
  )
}

function Bars({ rows, valueKey, labelKey, format = formatRupiah }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1)
  return (
    <div style={{ display: 'grid', gap: '0.9rem' }}>
      {rows.map((row, index) => {
        const value = Number(row[valueKey]) || 0
        return (
          <div key={`${row[labelKey]}-${index}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: '600' }}>{row[labelKey]}</span><span>{format(value)}</span>
            </div>
            <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', marginTop: '0.35rem', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max((value / max) * 100, value ? 2 : 0)}%`, height: '100%', background: 'var(--primary-color)', borderRadius: '4px' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TrendChart({ rows }) {
  if (!rows.length) return <p style={{ color: 'var(--text-muted)' }}>Belum ada data dalam rentang ini.</p>
  const width = 720
  const height = 220
  const pad = 28
  const values = rows.map((row) => Number(row.gross_total) || 0)
  const max = Math.max(...values, 1)
  const step = rows.length > 1 ? (width - pad * 2) / (rows.length - 1) : 0
  const points = values.map((value, index) => `${pad + index * step},${height - pad - (value / max) * (height - pad * 2)}`).join(' ')
  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="trend-title trend-desc" style={{ width: '100%', minHeight: '180px' }}>
        <title id="trend-title">Tren omzet harian</title>
        <desc id="trend-desc">Omzet tertinggi {formatRupiah(max)}. Rincian lengkap tersedia pada tabel setelah grafik.</desc>
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--border-color)" strokeWidth="2" />
        <polyline points={points} fill="none" stroke="var(--primary-color)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((value, index) => (
          <circle key={rows[index].sale_date} cx={pad + index * step} cy={height - pad - (value / max) * (height - pad * 2)} r="5" fill="var(--primary-color)">
            <title>{rows[index].sale_date}: {formatRupiah(value)}</title>
          </circle>
        ))}
      </svg>
      <figcaption style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Arahkan penunjuk ke titik untuk melihat nominal.</figcaption>
    </figure>
  )
}

function DailyTable({ rows }) {
  return (
    <div className="table-container">
      <table>
        <thead><tr><th>Tanggal (WIB)</th><th>Transaksi</th><th>Tunai</th><th>QRIS/TF</th><th>Rata-rata</th><th>Omzet</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={row.sale_date}>
              <td>{wibLabel(`${row.sale_date}T00:00:00+07:00`, { day: 'numeric', month: 'long', year: 'numeric' })}</td>
              <td>{Number(row.transaction_count).toLocaleString('id-ID')}</td>
              <td>{formatRupiah(row.cash_total)}</td>
              <td>{formatRupiah(row.qris_transfer_total)}</td>
              <td>{formatRupiah(row.average_ticket)}</td>
              <td style={{ fontWeight: '600' }}>{formatRupiah(row.gross_total)}</td>
            </tr>
          )) : <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada transaksi dalam rentang ini.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

export default async function LaporanPage({ searchParams }) {
  const params = (await searchParams) || {}
  const filter = PAYMENT_FILTERS.has(params.filter) ? params.filter : 'ALL'
  const dates = parseDates(params)

  await verifySession('/dashboard/laporan')
  const store = await getMyStore()
  if (!store) redirect('/dashboard/settings')

  const from = wibDayRange(dates.from).start
  const to = wibDayRange(dates.to).end
  const rpcArgs = { p_store_id: store.id, p_from: from, p_to: to, p_payment_method: filter === 'ALL' ? null : filter }
  const supabase = await createClient()
  const pro = isPro(store)
  const tier = planTier(store)

  // Gerbang sebelum panggilan: toko FREE tidak pernah memanggil RPC lanjutan.
  const dailyPromise = supabase.rpc('report_daily_totals', rpcArgs)
  const advancedPromises = pro ? [
    supabase.rpc('report_top_products', rpcArgs),
    supabase.rpc('report_cashier_performance', rpcArgs),
    supabase.rpc('report_payment_split', rpcArgs),
  ] : []
  const [dailyResult, ...advancedResults] = await Promise.all([dailyPromise, ...advancedPromises])
  const [productsResult, cashiersResult, paymentResult] = advancedResults
  const error = dailyResult.error || productsResult?.error || cashiersResult?.error || paymentResult?.error
  const daily = error ? [] : (dailyResult.data || [])
  const products = error ? [] : (productsResult?.data || [])
  const cashiers = error ? [] : (cashiersResult?.data || [])
  const payments = error ? [] : (paymentResult?.data || [])
  const total = daily.reduce((sum, row) => sum + (Number(row.gross_total) || 0), 0)
  const count = daily.reduce((sum, row) => sum + (Number(row.transaction_count) || 0), 0)

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Laporan Pendapatan</h2>
          <p style={{ color: 'var(--text-muted)' }}>{store.name} · Paket {tier}</p>
        </div>
        <div aria-label="Filter metode pembayaran" style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '0.25rem' }}>
          {[['ALL', 'Semua'], ['CASH', 'Tunai'], ['QRIS/TF', 'QRIS/TF']].map(([value, label]) => (
            <Link key={value} href={reportHref(value, dates)} aria-current={filter === value ? 'page' : undefined} style={pillStyle(filter === value)}>{label}</Link>
          ))}
        </div>
      </div>

      <form method="get" className="card" style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', padding: '1rem' }}>
        <input type="hidden" name="filter" value={filter} />
        <label className="form-group" style={{ flex: '1 1 180px' }}><span className="label">Dari tanggal</span><input className="input" type="date" name="from" defaultValue={dates.from} required /></label>
        <label className="form-group" style={{ flex: '1 1 180px' }}><span className="label">Sampai tanggal</span><input className="input" type="date" name="to" defaultValue={dates.to} required /></label>
        <button className="btn btn-primary" type="submit">Terapkan rentang</button>
      </form>

      <ErrorNotice error={error} />
      {!error && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <Stat label="Total omzet" value={formatRupiah(total)} hint={`${dates.from} sampai ${dates.to} (WIB)`} />
          <Stat label="Jumlah transaksi" value={count.toLocaleString('id-ID')} />
          <Stat label="Rata-rata transaksi" value={formatRupiah(count ? total / count : 0)} />
          <Stat label="Hari aktif" value={daily.length.toLocaleString('id-ID')} />
        </div>
        <section className="card" aria-labelledby="daily-title" style={{ padding: 0, overflow: 'hidden' }}>
          <h3 id="daily-title" style={{ fontSize: '1.125rem', padding: '1.25rem' }}>Laporan harian</h3>
          <DailyTable rows={daily} />
        </section>
        {pro ? <AdvancedReports daily={daily} products={products} cashiers={cashiers} payments={payments} /> : <UpgradeNotice />}
      </>}
    </div>
  )
}

function AdvancedReports({ daily, products, cashiers, payments }) {
  return (
    <section aria-labelledby="advanced-title" style={{ display: 'grid', gap: '1rem' }}>
      <div><h3 id="advanced-title" style={{ fontSize: '1.25rem' }}>Laporan lanjutan PRO</h3><p style={{ color: 'var(--text-muted)' }}>Produk, kasir, pembayaran, dan tren dalam rentang terpilih.</p></div>
      <div className="card"><h4 style={{ marginBottom: '1rem' }}>Tren omzet harian</h4><TrendChart rows={daily} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <h4 style={{ marginBottom: '1rem' }}>Produk terlaris</h4>
          {products.length ? <Bars rows={products} valueKey="quantity_sold" labelKey="product_name" format={(value) => `${value.toLocaleString('id-ID')} item`} /> : <p style={{ color: 'var(--text-muted)' }}>Belum ada produk terjual.</p>}
        </div>
        <div className="card">
          <h4 style={{ marginBottom: '1rem' }}>Performa kasir</h4>
          {cashiers.length ? <Bars rows={cashiers} valueKey="gross_total" labelKey="cashier_name" /> : <p style={{ color: 'var(--text-muted)' }}>Belum ada data kasir.</p>}
        </div>
        <div className="card">
          <h4 style={{ marginBottom: '1rem' }}>Pembagian metode pembayaran</h4>
          {payments.length ? <Bars rows={payments} valueKey="gross_total" labelKey="payment_method" /> : <p style={{ color: 'var(--text-muted)' }}>Belum ada data pembayaran.</p>}
        </div>
      </div>
    </section>
  )
}

function UpgradeNotice() {
  return (
    <section className="card" aria-labelledby="upgrade-report-title" style={{ background: 'var(--secondary-color)', borderColor: 'var(--primary-light)' }}>
      <h3 id="upgrade-report-title" style={{ fontSize: '1.125rem' }}>Buka laporan lanjutan dengan PRO</h3>
      <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 1rem' }}>Lihat produk terlaris, performa kasir, pembagian pembayaran, dan tren harian.</p>
      <Link className="btn btn-primary" href="/pricing">Lihat paket PRO</Link>
    </section>
  )
}
