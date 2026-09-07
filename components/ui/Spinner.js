/** Indikator loading. `label` dibacakan pembaca layar; tanpa itu spinner hanya
 *  animasi kosong yang tidak mengumumkan apa pun. */
export default function Spinner({ size = 'md', label = 'Memuat…' }) {
  return (
    <span
      className={size === 'sm' ? 'spinner spinner-sm' : 'spinner'}
      role="status"
      aria-live="polite"
    >
      <span className="visually-hidden">{label}</span>
    </span>
  )
}
