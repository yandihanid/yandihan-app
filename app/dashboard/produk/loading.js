import Skeleton, { SkeletonLines } from '@/components/ui/Skeleton'

export default function ProdukLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Skeleton variant="title" />
      <div className="card">
        <SkeletonLines lines={3} gap="1rem" />
      </div>
      <div className="card">
        <SkeletonLines lines={6} gap="1rem" />
      </div>
    </div>
  )
}
