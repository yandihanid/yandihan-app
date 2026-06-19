import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ReportAccordion from './ReportAccordion'

export const dynamic = 'force-dynamic'

export default async function LaporanPage({ searchParams }) {
  const filter = (await searchParams).filter || 'ALL'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!store) redirect('/dashboard/settings')

  let query = supabase
    .from('transactions')
    .select('amount, created_at')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  if (filter !== 'ALL') {
    query = query.eq('payment_method', filter)
  }

  const { data: transactions } = await query

  // Grouping Logic
  const grouped = {}
  
  if (transactions) {
    transactions.forEach(tx => {
      const dateObj = new Date(tx.created_at)
      
      const monthYear = dateObj.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
      const dayDate = dateObj.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = { total: 0, days: {} }
      }
      
      grouped[monthYear].total += Number(tx.amount)
      
      if (!grouped[monthYear].days[dayDate]) {
        grouped[monthYear].days[dayDate] = 0
      }
      
      grouped[monthYear].days[dayDate] += Number(tx.amount)
    })
  }

  // Convert to array for rendering
  const reports = Object.keys(grouped).map(monthStr => {
    const monthData = grouped[monthStr]
    const dailyData = Object.keys(monthData.days).map(dayStr => ({
      date: dayStr,
      total: monthData.days[dayStr]
    }))
    
    // Sort days descending (e.g. 19 Juni, 18 Juni)
    dailyData.sort((a, b) => {
       const [dayA] = a.date.split(' ')
       const [dayB] = b.date.split(' ')
       return parseInt(dayB) - parseInt(dayA)
    })

    return {
      month: monthStr,
      total: monthData.total,
      dailyData
    }
  })

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
          reports.map((report, idx) => (
            <ReportAccordion 
              key={idx} 
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
