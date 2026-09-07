import Link from 'next/link'

/**
 * Tombol dan tautan-yang-tampak-seperti-tombol.
 *
 * Kenapa ada: `.btn` di globals.css sudah lengkap (bentuk pill, transisi,
 * state disabled), tapi pemakaiannya di repo ini menimpanya dengan inline style
 * yang tidak konsisten -- ada yang memaksa `borderRadius: '8px'` sehingga
 * bentuknya berbeda dari tombol di sebelahnya. Membungkusnya jadi komponen
 * membuat penimpaan itu tidak lagi diperlukan.
 *
 * `href` mengubahnya jadi <Link> tanpa mengubah tampilan. Itu penting untuk
 * navigasi: sebelumnya beberapa tempat memakai <button onClick> lalu
 * window.location.href, yang berarti reload penuh dan kehilangan state.
 *
 * Server Component -- tidak ada state di sini, jadi tidak perlu 'use client'.
 */
export default function Button({
  variant = 'primary',
  size,
  block = false,
  href,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size ? `btn-${size}` : '',
    block ? 'btn-block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (href) {
    // `disabled` tidak ada artinya pada <a>; pemanggil yang butuh itu harus
    // memakai <button>. Kalau dilewatkan, tautannya diganti span non-interaktif
    // supaya tidak ada tautan mati yang tetap bisa diklik.
    if (rest.disabled) {
      const { disabled, ...spanRest } = rest
      return (
        <span className={classes} aria-disabled="true" {...spanRest}>
          {children}
        </span>
      )
    }
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    )
  }

  return (
    <button type={rest.type ?? 'button'} className={classes} {...rest}>
      {children}
    </button>
  )
}
