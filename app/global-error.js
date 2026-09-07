'use client'

import './globals.css'

/**
 * Batas error terakhir: dipakai kalau root layout sendiri yang gagal.
 *
 * Karena file ini MENGGANTI root layout saat aktif, ia harus membawa <html> dan
 * <body>-nya sendiri, dan harus mengimpor globals.css sendiri -- kalau tidak,
 * layar terakhir yang dilihat pengguna adalah HTML tanpa gaya sama sekali.
 *
 * Font next/font tidak dipasang di sini secara sengaja: pada titik ini yang
 * penting adalah halaman ini muncul, bukan tampil dengan font yang benar. Stack
 * fallback di --font-sans sudah cukup.
 *
 * `metadata` tidak bisa diekspor dari Client Component, jadi judul halaman
 * di-set lewat komponen <title> React.
 */
export default function GlobalError({ error, unstable_retry }) {
  return (
    <html lang="id">
      <body>
        <title>Terjadi kesalahan · Yandihan Kasir</title>
        <main
          className="container"
          style={{ padding: '4rem 1.5rem', maxWidth: '560px' }}
        >
          <div className="card">
            <h1 style={{ fontSize: '1.375rem', margin: '0 0 0.75rem 0' }}>
              Aplikasi gagal dimuat
            </h1>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
              Terjadi kesalahan di luar dugaan. Data yang sudah tersimpan tidak
              terpengaruh.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => unstable_retry()}>
              Coba lagi
            </button>
            {error?.digest && (
              <p style={{ marginTop: '1.5rem', marginBottom: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Kode kesalahan: <code>{error.digest}</code>
              </p>
            )}
          </div>
        </main>
      </body>
    </html>
  )
}
