import Switch from './Switch'

/**
 * Satu baris setelan: judul + penjelasan di kiri, Switch di kanan.
 *
 * `htmlFor`/`id` disambungkan supaya judulnya menjadi nama aksesibel switch-nya
 * dan mengklik judul ikut mengubah setelan -- keduanya tidak berlaku di dua
 * komponen toggle yang ada sekarang.
 */
export default function SwitchRow({ id, title, description, checked, onChange, disabled, busy }) {
  const descId = description ? `${id}-desc` : undefined

  return (
    <div className="switch-row">
      <div className="switch-row-text">
        <label htmlFor={id}>
          <strong>{title}</strong>
        </label>
        {description && <span id={descId}>{description}</span>}
      </div>
      <Switch
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled || busy}
        label={title}
        aria-describedby={descId}
      />
    </div>
  )
}
