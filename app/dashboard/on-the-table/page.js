import { verifySession, getMyStore } from '@/lib/dal'
import OnTheTableManager from './OnTheTableManager'

export const dynamic = 'force-dynamic'

export default async function OnTheTablePage() {
  await verifySession('/dashboard/on-the-table')
  const store = await getMyStore()
  if (!store) return <div style={{ padding: '2rem' }}>Buat toko dulu.</div>
  return <OnTheTableManager storeId={store.id} storeName={store.name} />
}
