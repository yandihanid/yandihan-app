'use client'

import { useEffect } from 'react'
import Button from '@/components/ui/Button'

/**
 * Batas error untuk seluruh aplikasi di bawah root layout.
 *
 * Sebelum file ini ada, kegagalan render apa pun menampilkan layar bawaan
 * Next.js: judul berbahasa Inggris, tanpa jalan keluar selain tombol back
 * browser. Untuk pemilik warung yang sedang berjualan itu berarti aplikasinya
 * "mati" tanpa keterangan.
 *
 * `unstable_retry` (bukan `reset`) adalah yang benar di Next 16: ia mengambil
 * ulang DAN merender ulang segmen ini, jadi kegagalan sementara -- koneksi
 * Supabase terputus sedetik, misalnya -- pulih tanpa reload penuh. `reset` hanya
 * membersihkan state error tanpa fetch ulang, sehingga error yang sama biasanya
 * langsung muncul lagi.
 */
export default function AppError({ error, unstable_retry }) {
  useEffect(() => {
    // digest adalah satu-satunya penghubung ke log server: pesan asli error
    // Server Component sengaja tidak dikirim ke browser.
    console.error('Render gagal', { digest: error?.digest, message: error?.message })
  }, [error])

  return (
    <main className="container" style={{ padding: '4rem 1.5rem', maxWidth: '560px' }}>
      <div className="card">
        <h1 style={{ fontSize: '1.375rem', margin: '0 0 0.75rem 0' }}>Ada yang tidak berjalan</h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
          Halaman ini gagal dimuat. Data Anda tidak terpengaruh — transaksi yang
          sudah tercatat tetap tersimpan. Coba muat ulang halamannya.
        </p>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => unstable_retry()}>Coba lagi</Button>
          <Button variant="secondary" href="/dashboard">
            Ke Dashboard
          </Button>
        </div>

        {error?.digest && (
          <p style={{ marginTop: '1.5rem', marginBottom: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Kode kesalahan: <code>{error.digest}</code>
          </p>
        )}
      </div>
    </main>
  )
}
