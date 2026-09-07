import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site'

/**
 * Gambar pratinjau saat tautan situs ini dibagikan (WhatsApp, Telegram,
 * Facebook, X). Sebelum ini tidak ada sama sekali: landing page adalah
 * "use client" sehingga tidak bisa mengekspor metadata, jadi setiap tautan yang
 * dibagikan tampil sebagai teks polos. Untuk produk yang penyebarannya justru
 * lewat WhatsApp grup UMKM, itu kehilangan yang mahal.
 *
 * Dibuat dengan kode, bukan berkas gambar, supaya teksnya ikut berubah kalau
 * SITE_NAME/SITE_TAGLINE berubah -- satu sumber, sama seperti judul halaman.
 *
 * Batasan next/og yang saya patuhi di sini (docs: image-response.md):
 *   * hanya flexbox. `display: grid` tidak didukung Satori.
 *   * setiap elemen dengan lebih dari satu anak WAJIB punya display eksplisit.
 *   * tanpa berkas font tambahan: `fonts` opsional, dan font bawaan next/og
 *     sudah cukup. Plus Jakarta Sans yang dipakai situs hanya tersedia sebagai
 *     woff2 dari next/font, sementara ImageResponse hanya menerima
 *     ttf/otf/woff -- jadi memaksakannya berarti menambah berkas font kedua ke
 *     repo demi satu gambar. Tidak sebanding.
 *   * anggaran bundel 500 KB. Berkas ini hanya JSX + warna.
 *
 * Warnanya disalin sebagai hex, bukan var(--primary-color): gambar ini dirender
 * di luar dokumen, jadi tidak ada :root yang bisa dibaca.
 */
export const alt = `${SITE_NAME} - ${SITE_TAGLINE}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 55%, #DBEAFE 100%)',
        }}
      >
        {/* Logo: kotak biru berisi huruf Y, sama seperti .lp-logo-mark di header. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '76px',
              height: '76px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
              color: '#FFFFFF',
              fontSize: '46px',
              fontWeight: 700,
            }}
          >
            Y
          </div>
          <div style={{ fontSize: '40px', fontWeight: 700, color: '#0F172A' }}>{SITE_NAME}</div>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: '46px',
            maxWidth: '900px',
            fontSize: '68px',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-2px',
            color: '#0F172A',
          }}
        >
          Kasir dari HP, laporan langsung jadi.
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: '28px',
            maxWidth: '860px',
            fontSize: '32px',
            lineHeight: 1.45,
            color: '#475569',
          }}
        >
          Satu tautan untuk kasir Anda. Tanpa pasang aplikasi, tanpa biaya untuk memulai.
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '46px',
            padding: '14px 28px',
            borderRadius: '999px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            fontSize: '28px',
            fontWeight: 700,
          }}
        >
          Gratis selamanya untuk 1 kasir
        </div>
      </div>
    ),
    size
  )
}
