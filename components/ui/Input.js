/** Input teks di atas `.input` -- kelas yang dipakai layar kasir sejak lama
 *  tapi baru sekarang punya definisi CSS-nya. Tidak ada logika di sini; yang
 *  penting adalah semua input di aplikasi memakai satu tinggi dan satu radius. */
export default function Input({ className = '', ...rest }) {
  return <input className={`input ${className}`.trim()} {...rest} />
}
