import Skeleton, { SkeletonLines } from '@/components/ui/Skeleton'

/** Skeleton Ringkasan: satu kartu total, baris filter, lalu tabel transaksi.
 *  Bentuknya mengikuti dashboard/page.js supaya tidak ada pergeseran layout. */
export default function DashboardLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Skeleton variant="title" />
      <Skeleton variant="card" />
      <Skeleton height="44px" width="260px" />
      <div className="card">
        <SkeletonLines lines={6} gap="1rem" />
      </div>
    </div>
  )
}
