/**
 * Placeholder berbentuk konten. Dipakai file loading.js per sub-route.
 *
 * `aria-hidden` disengaja: bentuknya tidak punya makna untuk dibacakan, dan
 * pengumuman "sedang memuat" sudah ditangani Next lewat batas Suspense-nya.
 */
export function Skeleton({ variant = '', width, height, style, className = '' }) {
  const classes = ['skeleton', variant ? `skeleton-${variant}` : '', className]
    .filter(Boolean)
    .join(' ')
  return <div className={classes} style={{ width, height, ...style }} aria-hidden="true" />
}

/** Beberapa baris teks dengan baris terakhir lebih pendek, seperti paragraf
 *  sungguhan. */
export function SkeletonLines({ lines = 3, gap = '0.5rem' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}

export default Skeleton
