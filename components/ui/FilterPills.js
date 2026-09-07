import Link from 'next/link'

/**
 * Segmented control untuk filter. Menggantikan dua baris filter yang ditulis
 * ulang dengan style inline: dashboard/RealtimeTransactions.js dan
 * dashboard/laporan/page.js -- keduanya punya tampilan sama tapi tidak berbagi
 * satu baris kode pun, jadi setiap perubahan harus dilakukan dua kali.
 *
 * Dua mode:
 *   * `items[].href` -> <Link>, dengan aria-current pada yang aktif. Dipakai
 *     kalau filternya ada di URL (bisa di-bookmark, bisa di-refresh).
 *   * `onSelect`     -> <button aria-pressed>. Dipakai kalau filternya hanya
 *     state di klien.
 *
 * Tidak ada hook di sini, jadi komponennya bisa dipakai dari Server Component
 * maupun Client Component tanpa 'use client'.
 */
export default function FilterPills({ items, value, onSelect, label = 'Filter' }) {
  return (
    <div className="filter-pills" role="group" aria-label={label}>
      {items.map((item) => {
        const active = item.value === value
        if (item.href) {
          return (
            <Link
              key={item.value}
              href={item.href}
              className="filter-pill"
              aria-current={active ? 'true' : undefined}
              scroll={false}
            >
              {item.label}
            </Link>
          )
        }
        return (
          <button
            key={item.value}
            type="button"
            className="filter-pill"
            aria-pressed={active ? 'true' : 'false'}
            onClick={() => onSelect?.(item.value)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
