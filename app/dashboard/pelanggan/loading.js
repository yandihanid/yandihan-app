import Skeleton, { SkeletonLines } from '@/components/ui/Skeleton'

export default function PelangganLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Skeleton variant="title" />
      <Skeleton variant="card" />
      <div className="card">
        <SkeletonLines lines={6} gap="1rem" />
      </div>
    </div>
  )
}
