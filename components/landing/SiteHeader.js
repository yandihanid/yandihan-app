import Link from 'next/link'
import MobileNav from './MobileNav'

/**
 * Menu halaman publik. Satu daftar untuk SEMUA halaman publik -- landing,
 * /pricing, /terms, /privacy -- dan dipakai dua kali di setiap halaman: nav
 * desktop di bawah dan panel mobile di island. Menu yang ditulis ulang per
 * halaman selalu berakhir berbeda antar halaman.
 *
 * Href-nya diawali `/` walau menunjuk anchor di landing page, karena header ini
 * juga dirender di /pricing dan /terms tempat section itu tidak ada. Dari
 * landing page sendiri, `/#fitur` tetap menggulir ke section yang sama.
 */
export const PUBLIC_NAV_LINKS = [
  { href: '/#cara-kerja', label: 'Cara Kerja' },
  { href: '/#fitur', label: 'Fitur' },
  { href: '/pricing', label: 'Harga' },
  { href: '/#faq', label: 'FAQ' },
]

/**
 * Header halaman publik. Server Component: satu-satunya bagian interaktif
 * (menu mobile) dipisah ke island MobileNav.
 */
export default function SiteHeader({ links = PUBLIC_NAV_LINKS }) {
  return (
    <header className="lp-header">
      <div className="lp-header-inner">
        <Link href="/" className="lp-logo" aria-label="Yandihan Kasir, ke halaman utama">
          <span className="lp-logo-mark" aria-hidden="true">
            Y
          </span>
          Yandihan.
        </Link>

        <nav className="lp-nav" aria-label="Menu utama">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="lp-nav-link">
              {link.label}
            </Link>
          ))}
          <span className="lp-nav-divider" aria-hidden="true" />
          <Link href="/login" className="lp-nav-link lp-nav-link-strong">
            Masuk
          </Link>
          <Link href="/signup" className="btn btn-primary btn-sm">
            Daftar Gratis
          </Link>
        </nav>

        <MobileNav links={links} />
      </div>
    </header>
  )
}
