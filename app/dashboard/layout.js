import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Settings, LogOut, BarChart3 } from 'lucide-react'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '1rem 0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Yandihan</h1>
          </div>
          <div className="flex gap-4">
            <form action="/auth/signout" method="post">
              <button className="btn" style={{ color: 'white', backgroundColor: 'transparent', padding: '0.5rem' }}>
                <LogOut size={20} />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container flex" style={{ marginTop: '2rem', flex: 1, gap: '2rem', flexWrap: 'wrap' }}>
        {/* Sidebar */}
        <aside style={{ width: '100%', maxWidth: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/dashboard" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', backgroundColor: 'transparent', boxShadow: 'none' }}>
            <LayoutDashboard size={18} style={{ marginRight: '10px' }} />
            Ringkasan
          </Link>
          <Link href="/dashboard/laporan" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', backgroundColor: 'transparent', boxShadow: 'none' }}>
            <BarChart3 size={18} style={{ marginRight: '10px' }} />
            Laporan
          </Link>
          <Link href="/dashboard/produk" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', backgroundColor: 'transparent', boxShadow: 'none' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Gudang Produk
          </Link>
          <Link href="/dashboard/settings" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', backgroundColor: 'transparent', boxShadow: 'none' }}>
            <Settings size={18} style={{ marginRight: '10px' }} />
            Pengaturan
          </Link>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, minWidth: '300px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
