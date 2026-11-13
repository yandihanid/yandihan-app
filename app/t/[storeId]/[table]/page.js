import { createServiceClient } from '@/utils/supabase/service'
import { TABLE_SERVICE_FEE_IDR } from '@/lib/tableOrderFlow'
import { withColumnFallback } from '@/lib/supabaseFallback'
import TableOrderClient from './TableOrderClient'
import TableOrderStatus from './TableOrderStatus'
import styles from './tableOrder.module.css'

export const dynamic = 'force-dynamic'

const PRODUCT_FIELDS = 'id, name, price, stock, is_sub_product, image_url'

const STORE_FIELDS =
  'id, name, address, phone, on_table_enabled, logo_url, gmaps_review_url, gmaps_review_note'

// Bentuk lama, tanpa kolom branding. Dipakai hanya kalau select utama gagal
// karena database belum menjalankan migrasi 0020. Tanpa fallback ini, satu
// migrasi yang belum dijalankan membuat seluruh halaman pesan meja ikut
// gagal — padahal_logo dan pop up rating memang fitur tambahan, bukan syarat
// halaman ini bisa dipakai.
const STORE_FIELDS_WITHOUT_BRANDING = 'id, name, address, phone, on_table_enabled'

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

/**
 * Ambil data toko untuk halaman pelanggan.
 *
 * Kalau select utama gagal, ulangi sekali dengan daftar kolom tanpa
 * branding: PostgREST menolak seluruh query kalau satu kolom yang diminta
 * belum ada di database (mis. migrasi 0020 belum dijalankan). Toko tetap
 * terbaca, hanya logo dan setelan rating yang belum dipakai.
 */
async function loadStore(supabase, storeId) {
  return withColumnFallback(
    supabase.from('stores').select(STORE_FIELDS).eq('id', storeId).maybeSingle(),
    supabase
      .from('stores')
      .select(STORE_FIELDS_WITHOUT_BRANDING)
      .eq('id', storeId)
      .maybeSingle()
  )
}

export default async function TableOrderPage({ params, searchParams }) {
  const { storeId, table } = await params
  const query = await searchParams
  const tableNumber = Number.parseInt(table, 10)

  const supabase = createServiceClient()

  const { data: store } = await loadStore(supabase, storeId)

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
        logoUrl={store.logo_url || null}
        reviewUrl={store.gmaps_review_url || null}
        reviewNote={store.gmaps_review_note || null}
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
      store={{ id: store.id, name: store.name, address: store.address, logoUrl: store.logo_url || null }}
      tableNumber={tableNumber}
      tableLabel={tableRow?.label || tableRow?.note || null}
      products={products || []}
      serviceFee={TABLE_SERVICE_FEE_IDR}
    />
  )
}
