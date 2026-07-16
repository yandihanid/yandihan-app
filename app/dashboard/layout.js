import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Settings, LogOut, BarChart3, Package, Users } from 'lucide-react'

const menu = [
  { href: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/dashboard/laporan', label: 'Laporan', icon: BarChart3 },
  { href: '/dashboard/produk', label: 'Gudang Produk', icon: Package },
  { href: '/dashboard/pelanggan', label: 'Pelanggan', icon: Users },
  { href: '/dashboard/settings', label: 'Pengaturan', icon: Settings },
]

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      <header style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '1rem 0' }}>
        <div className="container flex justify-between items-center">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Yandihan</h1>
          <form action="/auth/signout" method="post">
            <button className="btn" style={{ color: 'white', backgroundColor: 'transparent', padding: '0.5rem' }}>
              <LogOut size={20} />
            </button>
          </form>
        </div>
      </header>
      <div className="container flex" style={{ marginTop: '2rem', flex: 1, gap: '2rem', flexWrap: 'wrap' }}>
        <aside style={{ width: '100%', maxWidth: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {menu.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', backgroundColor: 'transparent', boxShadow: 'none' }}>
              <Icon size={18} style={{ marginRight: '10px' }} />
              {label}
            </Link>
          ))}
        </aside>
        <main style={{ flex: 1, minWidth: '300px' }}>{children}</main>
      </div>
    </div>
  )
}
