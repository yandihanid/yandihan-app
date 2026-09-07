import Button from '@/components/ui/Button'

export const metadata = {
  title: 'Halaman tidak ditemukan',
  // Halaman 404 tidak boleh masuk indeks: kalau ikut, mesin pencari
  // menampilkannya sebagai hasil yang sah.
  robots: { index: false, follow: false },
}

/**
 * Layar 404 berbahasa Indonesia.
 *
 * Tautan keluarnya dipilih berdasarkan jalur yang benar-benar ada di aplikasi
 * ini: beranda untuk pengunjung, dashboard untuk pemilik yang sudah masuk.
 * Tidak ada tautan ke /c/<token> di sini -- link kasir hanya boleh datang dari
 * pemilik toko, bukan ditebak dari halaman error.
 */
export default function NotFound() {
  return (
    <main
      className="container flex flex-col items-center justify-center text-center"
      style={{ minHeight: '70vh', padding: '3rem 1.5rem', gap: '0.75rem' }}
    >
      <p style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary-light)', margin: 0 }}>
        404
      </p>
      <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Halaman tidak ditemukan</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: '44ch', lineHeight: 1.6 }}>
        Alamat yang Anda buka tidak ada, atau sudah dipindahkan. Kalau Anda tiba
        di sini dari link kasir, minta link terbaru dari pemilik toko — link lama
        berhenti berlaku setelah tokennya diputar.
      </p>
      <div className="flex gap-2 flex-wrap justify-center" style={{ marginTop: '0.5rem' }}>
        <Button href="/">Ke Beranda</Button>
        <Button variant="secondary" href="/dashboard">
          Ke Dashboard
        </Button>
      </div>
    </main>
  )
}
