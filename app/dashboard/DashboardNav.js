'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, LayoutDashboard, Package, Settings, Users } from 'lucide-react'

/**
 * Navigasi dashboard. Satu-satunya alasan komponen ini client: `usePathname()`.
 *
 * Sisa layout tetap Server Component, jadi yang ikut ke browser hanya lima
 * baris menu — bukan seluruh kerangka halaman.
 *
 * State aktif dipakai dua kali dengan cara berbeda supaya tidak bergantung pada
 * warna saja (WCAG 1.4.1): `aria-current="page"` untuk pembaca layar, dan
 * atribut yang sama dipakai sebagai selector CSS untuk latar + garis kiri.
 *
 * Kenapa bukan `pathname.startsWith(href)` untuk semuanya: '/dashboard' adalah
 * prefix dari keempat href lainnya, jadi startsWith membuat "Ringkasan" ikut
 * aktif di setiap halaman. Item root dicocokkan persis, sisanya dengan prefix
 * supaya rute anak (misal /dashboard/produk/123) tetap menyalakan induknya.
 */
const MENU = [
  { href: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/laporan', label: 'Laporan', icon: BarChart3 },
  { href: '/dashboard/produk', label: 'Produk', icon: Package },
  { href: '/dashboard/pelanggan', label: 'Pelanggan', icon: Users },
  { href: '/dashboard/settings', label: 'Pengaturan', icon: Settings },
]

function isActive(pathname, { href, exact }) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="dashboard-sidebar" aria-label="Menu dashboard">
      {MENU.map((item) => {
        const { href, label, icon: Icon } = item
        const active = isActive(pathname, item)
        return (
          <Link
            key={href}
            href={href}
            className="sidebar-link"
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            <span className="sidebar-label">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
