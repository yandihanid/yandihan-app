/** Pembungkus `.card`. `padding` bisa dikecilkan lewat prop supaya pemanggil
 *  tidak perlu menimpanya dengan inline style seperti sekarang. */
export default function Card({ as: Tag = 'div', padding, className = '', style, children, ...rest }) {
  return (
    <Tag
      className={`card ${className}`.trim()}
      style={padding ? { padding, ...style } : style}
      {...rest}
    >
      {children}
    </Tag>
  )
}
