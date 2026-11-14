'use client'

import { useEffect } from 'react'

/**
 * Cetak struk otomatis.
 *
 * Dipakai ketika kasir menekan "Cetak struk" di menu Antrean: halamannya
 * dibuka dengan `?print=1`, jadi printer harus langsung keluar tanpa kasir
 * menekan tombol cetak di dialog browser.
 *
 * Delay pendek (300 ms) memberi waktu browser menghitung ulang tata letak
 * setelah gambar logo selesai dimuat -- kalau langsung dipanggil, ukuran
 * kertas kadang keluar dengan baris yang terpotong.
 */
export default function AutoPrint({ enabled = false }) {
  useEffect(() => {
    if (!enabled) return undefined

    const timer = setTimeout(() => {
      window.print()
    }, 300)

    return () => clearTimeout(timer)
  }, [enabled])

  return null
}
