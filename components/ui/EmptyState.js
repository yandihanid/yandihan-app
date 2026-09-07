/**
 * Layar "belum ada data". Bedanya dengan teks kosong biasa: selalu menyertakan
 * satu langkah berikutnya. Sebelumnya beberapa tabel hanya menampilkan "Belum
 * ada data transaksi untuk ditampilkan." tanpa memberi tahu apa yang harus
 * dilakukan supaya ada datanya.
 */
export default function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty-state">
      {icon}
      {title && <strong>{title}</strong>}
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}
