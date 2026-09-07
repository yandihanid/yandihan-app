import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { verifySession } from '@/lib/dal'
import { SITE_NAME } from '@/lib/site'
import { ToastProvider } from '@/components/ui/Toast'
import DashboardNav from './DashboardNav'

/**
 * Kerangka dashboard.
 *
 * Tiga hal berubah dari versi sebelumnya:
 *
 * 1. `supabase.auth.getUser()` mentah -> `verifySession()` dari DAL. Bukan
 *    karena lebih singkat, tapi karena layout TIDAK ikut re-render saat
 *    navigasi antar rute di bawahnya (Partial Rendering), jadi cek di sini
 *    saja tidak pernah cukup — setiap page dan action punya cek sendiri lewat
 *    DAL yang sama. Cek di layout tetap ada sebagai pagar pertama supaya
 *    pengunjung tanpa sesi tidak melihat kerangka halaman sama sekali.
 *
 * 2. Menu pindah ke <DashboardNav>, island kecil yang memakai usePathname()
 *    untuk state aktif. Sebelumnya kelima tautan sama sekali tidak menunjukkan
 *    halaman mana yang sedang dibuka.
 *
 * 3. Class `.dashboard-container`/`.dashboard-sidebar`/`.sidebar-link` akhirnya
 *    dipakai. CSS-nya sudah ada di globals.css sejak lama termasuk blok
 *    @media (max-width: 768px)-nya, tapi tidak satu pun JSX memakai nama-nama
 *    itu — jadi di HP kelima tombol menumpuk di atas konten. Inline style lama
 *    juga memakai `.btn btn-secondary` lalu mencabut border, background, dan
 *    shadow-nya satu per satu; sekarang tidak ada yang perlu dicabut.
 *
 * ToastProvider dipasang di sini, bukan di root layout: yang memakai toast
 * hanya layar-layar dashboard, dan halaman publik (landing, harga, struk) tidak
 * perlu ikut memuat provider-nya.
 */
export default async function DashboardLayout({ children }) {
  await verifySession('/dashboard')

  return (
    <ToastProvider>
      <div className="flex flex-col min-h-screen">
        {/* Lompat ke konten: pengguna keyboard tidak harus melewati lima
            tautan menu di setiap halaman sebelum sampai ke isinya. */}
        <a href="#konten" className="skip-link">
          Lompat ke konten
        </a>

        <header className="dashboard-header">
          <div className="container flex justify-between items-center">
            <Link href="/dashboard" className="dashboard-brand">
              {SITE_NAME}
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="dashboard-signout">
                <LogOut size={20} aria-hidden="true" />
                <span className="dashboard-signout-label">Keluar</span>
              </button>
            </form>
          </div>
        </header>

        <div className="container dashboard-container">
          <DashboardNav />
          <main id="konten" className="dashboard-main">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
