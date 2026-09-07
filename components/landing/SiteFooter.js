import Link from 'next/link'
import { Mail } from 'lucide-react'
import { SITE_NAME, SOCIAL_LINKS, supportMailto } from '@/lib/site'

/**
 * Footer halaman publik. Server Component -- tidak ada state di sini.
 *
 * Tiga hal yang berubah dari versi sebelumnya:
 *
 *   1. Nomor WhatsApp `wa.me/6281234567890` dihapus. Itu nomor contoh dari
 *      dokumentasi, bukan nomor siapa pun; pelanggan yang mengkliknya membuka
 *      chat ke orang asing dan merasa sudah menghubungi kami.
 *   2. Path SVG Instagram diganti. Yang lama merender bentuk yang tidak
 *      menyerupai logo apa pun -- dua elipsis bertumpuk. lucide-react 1.20
 *      tidak lagi mengekspor `Instagram` (sudah saya periksa: `undefined`),
 *      jadi ikonnya memang harus inline di sini.
 *   3. Alamat email diambil dari lib/site.js, dan blok kontaknya HILANG kalau
 *      alamatnya null. Tombol kontak yang menuju alamat mati lebih buruk
 *      daripada tidak ada tombol kontak.
 */
export default function SiteFooter() {
  const mailto = supportMailto('Bantuan Yandihan Kasir')

  return (
    <footer className="lp-footer">
      <div className="lp-inner lp-footer-inner">
        <div className="lp-footer-brand">Yandihan.</div>
        <p className="lp-footer-text">
          Memberdayakan UMKM Indonesia dengan pencatatan penjualan dan laporan keuangan yang
          sederhana, cepat, dan bisa dipakai dari HP.
        </p>

        <nav className="lp-footer-links" aria-label="Tautan footer">
          <Link href="/pricing" className="lp-footer-link">
            Harga
          </Link>
          <Link href="/guide" className="lp-footer-link">
            Panduan
          </Link>
          <Link href="/login" className="lp-footer-link">
            Masuk
          </Link>
          <Link href="/terms" className="lp-footer-link">
            Syarat Layanan
          </Link>
          <Link href="/privacy" className="lp-footer-link">
            Kebijakan Privasi
          </Link>
          {mailto && (
            <a href={mailto} className="lp-footer-link">
              <Mail size={16} aria-hidden="true" style={{ marginRight: '0.4rem' }} />
              Hubungi Kami
            </a>
          )}
        </nav>

        {SOCIAL_LINKS.instagram && (
          <div className="lp-social">
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-social-link"
              aria-label={`Instagram ${SITE_NAME} (buka di tab baru)`}
            >
              {/* Glyph Instagram 24x24 standar: bingkai membulat, lensa, dan
                  titik jendela bidik. Yang lama tidak punya bingkai sama sekali. */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
          </div>
        )}

        {/* Tahunnya dievaluasi saat build, bukan saat kunjungan: halaman ini
            statis dan `Date` bukan API request-time, jadi Next tidak
            mendinamiskannya. Itu memang yang kita mau -- satu halaman statis
            untuk semua pengunjung -- dan tahun pada notice hak cipta yang
            mengikuti tanggal rilis sudah lazim. */}
        <p className="lp-footer-legal">
          &copy; {new Date().getFullYear()} {SITE_NAME}. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  )
}
