/**
 * Kotak pesan di atas `.alert` + empat variannya yang sudah ada di globals.css.
 *
 * Bagian yang bukan kosmetik: peran ARIA-nya. Pesan error dan sukses yang
 * muncul SETELAH interaksi (submit form, simpan setelan) harus diumumkan;
 * kalau tidak, pengguna pembaca layar mengirim form lalu tidak mendengar apa
 * pun dan tidak tahu apakah berhasil.
 *
 *   * variant="error"  -> role="alert" (diumumkan segera, memotong bacaan)
 *   * lainnya          -> role="status" + aria-live="polite" (menunggu jeda)
 *
 * `live={false}` untuk pesan yang sudah ada sejak halaman dirender (mis. banner
 * informasi statis) -- mengumumkan itu justru mengganggu.
 */
export default function Alert({ variant = 'info', live = true, className = '', children, ...rest }) {
  const isError = variant === 'error'
  const liveProps = live
    ? isError
      ? { role: 'alert' }
      : { role: 'status', 'aria-live': 'polite' }
    : {}

  return (
    <div className={`alert alert-${variant} ${className}`.trim()} {...liveProps} {...rest}>
      <div>{children}</div>
    </div>
  )
}
