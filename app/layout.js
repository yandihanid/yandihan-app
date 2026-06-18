import './globals.css'

export const metadata = {
  title: 'Yandihan - Laporan Keuangan UMKM',
  description: 'Sistem Laporan Keuangan UMKM via Telegram Bot',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  )
}
