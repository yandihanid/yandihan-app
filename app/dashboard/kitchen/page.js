import { verifySession, getMyStore } from '@/lib/dal'
import KitchenDisplay from './KitchenDisplay'

export const dynamic = 'force-dynamic'

export default async function KitchenPage() {
  await verifySession('/dashboard/kitchen')
  const store = await getMyStore()
  if (!store) return <div style={{ padding: '2rem' }}>Buat toko dulu.</div>

  return <KitchenDisplay storeId={store.id} storeName={store.name} />
}
