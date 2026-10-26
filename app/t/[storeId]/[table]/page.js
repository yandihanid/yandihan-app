import { createServiceClient } from '@/utils/supabase/service'
import TableOrderClient from './TableOrderClient'

export const dynamic = 'force-dynamic'

export default async function TableOrderPage({ params }) {
  const { storeId, table } = await params
  const supabase = createServiceClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, address, phone, on_table_enabled')
    .eq('id', storeId)
    .maybeSingle()

  if (!store) {
    return <main style={{ padding: '2rem' }}>Toko tidak ditemukan.</main>
  }
  if (!store.on_table_enabled) {
    return <main style={{ padding: '2rem' }}>Fitur On the Table belum aktif untuk toko ini.</main>
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock, is_sub_product, image_url')
    .eq('store_id', storeId)
    .order('name', { ascending: true })

  return (
    <TableOrderClient
      store={store}
      tableNumber={table}
      products={products || []}
    />
  )
}
