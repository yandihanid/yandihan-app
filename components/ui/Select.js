/** <select> memakai gaya `.input` yang sama dengan input teks. Tanpa ini
 *  keduanya berdampingan dengan tinggi berbeda, yang selalu terlihat seperti
 *  bug meski bukan. */
export default function Select({ className = '', children, ...rest }) {
  return (
    <select className={`input ${className}`.trim()} {...rest}>
      {children}
    </select>
  )
}
