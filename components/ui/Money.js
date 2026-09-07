import { formatRupiah } from '@/lib/format'

/**
 * Nominal rupiah. Membungkus formatRupiah() yang sudah ada supaya delapan
 * tempat yang masih menulis `Rp ${x.toLocaleString('id-ID')}` sendiri bisa
 * berhenti melakukannya -- format itu berbeda hasilnya untuk nilai desimal dan
 * untuk null/undefined (jadi "Rp NaN").
 *
 * `<data value>` dipakai supaya angka mesin-terbacanya tetap tersedia, sementara
 * yang tampil sudah diformat untuk manusia.
 */
export default function Money({ value, className, style }) {
  const n = Number(value ?? 0)
  return (
    <data value={Number.isFinite(n) ? n : 0} className={className} style={style}>
      {formatRupiah(value)}
    </data>
  )
}
