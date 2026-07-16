import './globals.css'

export const metadata = {
  title: 'Yandihan - Keuangan UMKM',
  description: 'Sistem Laporan Keuangan UMKM',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
