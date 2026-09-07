/**
 * Label + kontrol + hint + pesan error, dengan penyambungan aksesibilitas yang
 * benar. Ini yang paling sering salah kalau ditulis ulang setiap kali:
 *
 *   * `htmlFor` harus cocok dengan `id` kontrolnya, kalau tidak mengklik label
 *     tidak memfokuskan input dan pembaca layar membacakan input tanpa nama.
 *   * hint dan error harus dirujuk lewat `aria-describedby`, kalau tidak
 *     keduanya tidak pernah dibacakan.
 *   * error butuh `aria-invalid` pada kontrolnya, bukan hanya teks merah.
 *
 * Karena penyambungan itu memerlukan id, `Field` meneruskannya ke anak lewat
 * fungsi render: <Field id="nama" label="Nama">{(p) => <Input {...p} />}</Field>
 * Anak biasa (bukan fungsi) tetap didukung untuk kasus sederhana.
 */
export default function Field({ id, label, hint, error, required = false, children }) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const controlProps = {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? 'true' : undefined,
    required: required || undefined,
  }

  return (
    <div className="form-group">
      <label className="label" htmlFor={id}>
        {label}
        {required && (
          <>
            {' '}
            <span aria-hidden="true" style={{ color: 'var(--danger-color)' }}>
              *
            </span>
            <span className="visually-hidden">(wajib)</span>
          </>
        )}
      </label>

      {typeof children === 'function' ? children(controlProps) : children}

      {hint && (
        <span className="field-hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      )}
    </div>
  )
}
