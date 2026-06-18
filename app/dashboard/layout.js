import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Settings, LogOut } from 'lucide-react'

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
