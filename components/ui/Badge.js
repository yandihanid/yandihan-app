/** Label kecil untuk status baris tabel (mis. "Menunggu", "Selesai") dan tier
 *  langganan. Sebelumnya bentuk seperti ini ditulis dengan inline style di
 *  setiap tempat, jadi radius dan ukurannya tidak pernah sama. */
export default function Badge({ variant = 'neutral', className = '', children, ...rest }) {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()} {...rest}>
      {children}
    </span>
  )
}
