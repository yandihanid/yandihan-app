import { createServiceClient } from '@/utils/supabase/service'
import { TABLE_SERVICE_FEE_IDR } from '@/lib/tableOrderFlow'
import TableOrderClient from './TableOrderClient'
import TableOrderStatus from './TableOrderStatus'
import styles from './tableOrder.module.css'

export const dynamic = 'force-dynamic'

const PRODUCT_FIELDS = 'id, name, price, stock, is_sub_product, image_url'

function Notice({ title, message }) {
  return (
    <main className={styles.statusPage}>
      <div className={styles.statusShell}>
        <section className={styles.statusCard}>
          <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{title}</h1>
          <p className={styles.statusSub}>{message}</p>
        </section>
      </div>
    </main>
  )
}

export async function generateMetadata({ params }) {
  const { table } = await params
  return {
    title: `Pesan Meja ${table}`,
    robots: { index: false, follow: false },
  }
}

export default async function TableOrderPage({ params, searchParams }) {
  const { storeId, table } = await params
  const query = await searchParams
  const tableNumber = Number.parseInt(table, 10)

  const supabase = createServiceClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, address, phone, on_table_enabled')
    .eq('id', storeId)
    .maybeSingle()

  if (!store) {
    return <Notice title="Toko tidak ditemukan" message="Periksa kembali tautan atau QR yang Anda pindai." />
  }

  if (!store.on_table_enabled) {
    return (
      <Notice
        title="Pemesanan meja belum aktif"
        message="Toko ini belum mengaktifkan fitur On the Table. Silakan pesan langsung ke kasir."
      />
    )
  }

  if (!Number.isFinite(tableNumber) || tableNumber < 1) {
    return (
      <Notice
        title="Nomor meja tidak valid"
        message="Pindai ulang QR code yang ada di meja Anda."
      />
    )
  }

  // Halaman status setelah membayar. Nomor antrean baru muncul di sini setelah
  // pembayaran benar-benar diterima.
  if (query?.order) {
    return (
      <TableOrderStatus
        orderId={String(query.order)}
        storeId={store.id}
        tableNumber={tableNumber}
        storeName={store.name}
        initialStatus="pending"
      />
    )
  }

  const [{ data: products }, { data: tableRow }] = await Promise.all([
    supabase
      .from('products')
      .select(PRODUCT_FIELDS)
      .eq('store_id', store.id)
      .order('is_sub_product', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('store_tables')
      .select('table_number, label, note')
      .eq('store_id', store.id)
      .eq('table_number', tableNumber)
      .maybeSingle(),
  ])

  return (
    <TableOrderClient
      store={{ id: store.id, name: store.name, address: store.address }}
      tableNumber={tableNumber}
      tableLabel={tableRow?.label || tableRow?.note || null}
      products={products || []}
      serviceFee={TABLE_SERVICE_FEE_IDR}
    />
  )
}
