import Skeleton, { SkeletonLines } from '@/components/ui/Skeleton'

export default function SettingsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Skeleton variant="title" />
      <div className="card">
        <SkeletonLines lines={4} gap="1.25rem" />
      </div>
      <div className="card">
        <SkeletonLines lines={4} gap="1.25rem" />
      </div>
    </div>
  )
}
