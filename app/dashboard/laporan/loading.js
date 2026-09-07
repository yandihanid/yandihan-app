import Skeleton, { SkeletonLines } from '@/components/ui/Skeleton'

export default function LaporanLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Skeleton variant="title" />
      <Skeleton height="44px" width="300px" />
      <div className="card">
        <SkeletonLines lines={5} gap="1.25rem" />
      </div>
    </div>
  )
}
