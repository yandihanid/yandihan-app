'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

/**
 * Satu-satunya bagian header yang butuh state. Dipisah supaya SiteHeader dan
 * seluruh halaman publik tetap Server Component -- itulah yang membuat
 * `export const metadata` mungkin (lihat komentar di app/page.js).
 *
 * `links` datang dari server sebagai data biasa, jadi daftar menunya tetap satu
 * sumber untuk desktop dan mobile.
 */
export default function MobileNav({ links }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="lp-nav-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="lp-mobile-nav"
        aria-label={open ? 'Tutup menu' : 'Buka menu'}
      >
        {open ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
      </button>

      {/* Panel selalu ada di DOM tapi disembunyikan lewat atribut `hidden`.
          Dengan begitu aria-controls di atas selalu menunjuk ke elemen yang
          benar-benar ada -- kalau panelnya dilepas dari DOM saat tertutup,
          rujukannya menggantung dan pembaca layar tidak bisa mengumumkannya. */}
      <nav id="lp-mobile-nav" className="lp-mobile-nav" hidden={!open} aria-label="Menu utama">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="lp-mobile-nav-link"
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <hr className="lp-mobile-nav-divider" />
        <Link href="/login" className="lp-mobile-nav-link" onClick={() => setOpen(false)}>
          Masuk
        </Link>
        <Link
          href="/signup"
          className="btn btn-primary btn-block"
          onClick={() => setOpen(false)}
        >
          Daftar Gratis
        </Link>
      </nav>
    </>
  )
}
