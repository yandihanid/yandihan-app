/**
 * Toggle dua keadaan.
 *
 * Yang diperbaiki dibanding dua komponen toggle yang ada sekarang
 * (ToggleReceiptRequired.js dan ToggleStoreSettings.js, 68 baris nyaris
 * identik): keduanya memakai <button> tanpa role, tanpa aria-checked, dan tanpa
 * nama aksesibel. Bagi pembaca layar itu tombol tanpa nama yang tidak punya
 * keadaan -- pengguna tidak bisa tahu setelannya sedang hidup atau mati.
 *
 * Tidak ada state di dalam sini secara sengaja: pemanggil yang menyimpan
 * `checked`, sehingga ia bisa mengembalikan nilainya ke posisi lama kalau
 * server menolak. Toggle yang menyimpan state sendiri tidak bisa melakukan itu.
 */
export default function Switch({ checked, onChange, disabled = false, label, id, ...rest }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked ? 'true' : 'false'}
      aria-label={label}
      disabled={disabled}
      className="switch"
      onClick={() => onChange?.(!checked)}
      {...rest}
    />
  )
}
