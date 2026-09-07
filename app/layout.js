import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL, THEME_COLOR } from '@/lib/site'

/**
 * Font di-self-host oleh next/font pada waktu build. Sebelumnya globals.css
 * memakai `@import url('https://fonts.googleapis.com/...')`, yang berarti:
 * satu request pihak ketiga di jalur render kritis, dan dua origin
 * (fonts.googleapis.com + fonts.gstatic.com) harus diizinkan CSP. Keduanya
 * sekarang tidak diperlukan lagi -- lihat next.config.mjs.
 *
 * `variable` dipilih daripada `className` supaya nilainya bisa dipakai lewat
 * token --font-sans di globals.css, bukan hanya pada elemen yang membawa class.
 * Plus Jakarta Sans punya axis variable wght 200-800, jadi `weight` tidak
 * diperlukan dan satu file melayani semua ketebalan.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  // `fallback` sengaja tidak diisi. Tanpa itu next/font membuat font fallback
  // sendiri ('Plus Jakarta Sans Fallback') dengan size-adjust yang dihitung dari
  // metrik font aslinya, sehingga tidak ada pergeseran layout saat font selesai
  // dimuat. Mengisi `fallback` justru MENGGANTI fallback itu dengan daftar biasa
  // dan pergeserannya kembali. Stack sistem tetap ada, ditambahkan setelah
  // var(--font-jakarta) di globals.css.
})

/**
 * metadataBase wajib ada supaya URL relatif di OpenGraph/canonical dipetakan ke
 * domain yang benar. Tanpa itu, Next merender og:image sebagai path relatif dan
 * preview link di WhatsApp/Telegram -- kanal utama UMKM membagikan tautan --
 * tampil kosong.
 */
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  // Halaman kasir (/c/<token>) dan struk (/r/<id>) punya robots sendiri; yang
  // di sini hanya default untuk halaman publik.
  robots: { index: true, follow: true },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // maximumScale/userScalable sengaja tidak dibatasi: mengunci zoom membuat
  // struk dan tabel laporan tidak bisa diperbesar di layar kecil.
  themeColor: THEME_COLOR,
  colorScheme: 'light',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  )
}
