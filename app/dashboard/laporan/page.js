import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { verifySession, getMyStore } from '@/lib/dal'
import { wibDateString, wibLabel } from '@/lib/time'
import ReportAccordion from './ReportAccordion'

export const dynamic = 'force-dynamic'

const PAYMENT_FILTERS = new Set(['ALL', 'CASH', 'QRIS/TF'])

export default async function LaporanPage({ searchParams }) {
  const params = (await searchParams) || {}
  const filter = PAYMENT_FILTERS.has(params.filter) ? params.filter : 'ALL'

  await verifySession('/dashboard/laporan')

  // maybeSingle() lewat DAL: .single() dulu meledak (PGRST116) untuk pemilik
  // dengan lebih dari satu toko (temuan C11).
  const store = await getMyStore()
  if (!store) redirect('/dashboard/settings')

  const supabase = await createClient()
  let query = supabase
    .from('transactions')
    .select('amount, created_at')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  if (filter !== 'ALL') query = query.eq('payment_method', filter)

  const { data: transactions } = await query

  // Pengelompokan memakai tanggal WIB, bukan zona waktu mesin yang merender.
  // Dulu labelnya dibuat dengan toLocaleString('id-ID') tanpa timeZone, jadi di
  // Vercel (UTC) transaksi jam 06:30 WIB masuk ke hari sebelumnya (temuan C5).
  // Kunci pengelompokannya juga tanggal ISO WIB, bukan teks tampilan — teks
  // tampilan dulu diurutkan dengan parseInt() atas nama bulan Indonesia.
  const months = new Map()

  for (const tx of transactions || []) {
    const day = wibDateString(tx.created_at)
    const monthKey = day.slice(0, 7)
    const amount = Number(tx.amount) || 0

    let month = months.get(monthKey)
    if (!month) {
      month = { key: monthKey, total: 0, days: new Map() }
      months.set(monthKey, month)
    }

    month.total += amount
    month.days.set(day, (month.days.get(day) || 0) + amount)
  }

  const reports = [...months.values()]
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .map((month) => ({
      key: month.key,
      month: wibLabel(`${month.key}-01T00:00:00+07:00`, { month: 'long', year: 'numeric' }),
      total: month.total,
      dailyData: [...month.days.entries()]
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([day, total]) => ({
          date: wibLabel(`${day}T00:00:00+07:00`, { day: 'numeric', month: 'long', year: 'numeric' }),
          total,
        })),
    }))

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Laporan Pendapatan</h2>
        
        {/* Toggle Filter */}
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '0.25rem' }}>
          <Link 
            href="/dashboard/laporan?filter=ALL" 
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', backgroundColor: filter === 'ALL' ? 'white' : 'transparent', color: filter === 'ALL' ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: filter === 'ALL' ? 'var(--shadow-sm)' : 'none' }}
          >
            Semua
          </Link>
          <Link 
            href="/dashboard/laporan?filter=CASH" 
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', backgroundColor: filter === 'CASH' ? 'white' : 'transparent', color: filter === 'CASH' ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: filter === 'CASH' ? 'var(--shadow-sm)' : 'none' }}
          >
            Tunai
          </Link>
          <Link 
            href="/dashboard/laporan?filter=QRIS/TF" 
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', backgroundColor: filter === 'QRIS/TF' ? 'white' : 'transparent', color: filter === 'QRIS/TF' ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: filter === 'QRIS/TF' ? 'var(--shadow-sm)' : 'none' }}
          >
            QRIS/TF
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Belum ada data transaksi untuk ditampilkan.
          </div>
        ) : (
          reports.map((report) => (
            <ReportAccordion
              key={report.key}
              month={report.month} 
              total={report.total} 
              dailyData={report.dailyData} 
            />
          ))
        )}
      </div>
    </div>
  )
}
