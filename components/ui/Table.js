/**
 * Tabel dengan pembungkus `.table-container` yang membuatnya bisa digeser
 * horizontal di ponsel. Tanpa pembungkus itu tabel lima kolom memaksa seluruh
 * halaman melebar dan konten lain ikut terpotong.
 *
 * `caption` selalu dirender (tersembunyi secara visual kalau tidak diminta
 * tampil) karena tabel tanpa caption tidak punya nama untuk dibacakan.
 */
export default function Table({ caption, captionVisible = false, columns, children }) {
  return (
    <div className="table-container">
      <table>
        {caption && (
          <caption className={captionVisible ? undefined : 'visually-hidden'}>{caption}</caption>
        )}
        {columns && (
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key ?? col.label} scope="col" style={col.style}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
