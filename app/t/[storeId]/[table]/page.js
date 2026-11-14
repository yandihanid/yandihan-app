import { createServiceClient } from '@/utils/supabase/service'
import { TABLE_SERVICE_FEE_IDR } from '@/lib/tableOrderFlow'
import { normalizeTheme } from '@/lib/storeTheme'
import TableOrderClient from './TableOrderClient'
import TableOrderStatus from './TableOrderStatus'
import styles from './tableOrder.module.css'

export const dynamic = 'force-dynamic'

const PRODUCT_FIELDS = 'id, name, price, stock, is_sub_product, image_url, category'

const STORE_FIELDS =
  'id, name, address, phone, on_table_enabled, logo_url, gmaps_review_url, gmaps_review_note, theme_color'

// Bentuk lama, tanpa kolom branding. Dipakai hanya kalau select utama gagal
// karena database belum menjalankan migrasi 0020. Tanpa fallback ini, satu
// migrasi yang belum dijalankan membuat seluruh halaman pesan meja ikut
// gagal — padahal_logo dan pop up rating memang fitur tambahan, bukan syarat
// halaman ini bisa dipakai.
const STORE_FIELDS_WITHOUT_BRANDING = 'id, name, address, phone, on_table_enabled'

// Bentuk dengan branding tapi tanpa tema (migrasi 0023 belum dijalankan).
const STORE_FIELDS_WITHOUT_THEME =
  'id, name, address, phone, on_table_enabled, logo_url, gmaps_review_url, gmaps_review_note'

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
 * Kalau select utama gagal, ulangi dengan daftar kolom yang lebih pendek:
 * PostgREST menolak seluruh query kalau satu kolom yang diminta belum ada di
 * database (mis. migrasi 0020 / 0023 belum dijalankan). Toko tetap terbaca,
 * hanya logo, setelan rating, dan warna tema yang belum dipakai.
 */
async function loadStore(supabase, storeId) {
  const variants = [STORE_FIELDS, STORE_FIELDS_WITHOUT_THEME, STORE_FIELDS_WITHOUT_BRANDING]

  let last = { data: null, error: null }
  for (const columns of variants) {
    const result = await supabase.from('stores').select(columns).eq('id', storeId).maybeSingle()
    if (!result?.error) return result
    last = result
  }
  return last
}

/**
 * Ambil katalog produk.
 *
 * Kolom `category` hanya ada setelah migrasi 0023. Kalau belum ada, produknya
 * tetap dibaca tanpa kategori -- pemesanan tidak boleh berhenti gara-gara satu
 * migrasi belum dijalankan.
 */
async function loadProducts(supabase, storeId) {
  const withCategory = await supabase
    .from('products')
    .select(PRODUCT_FIELDS)
    .eq('store_id', storeId)
    .order('is_sub_product', { ascending: true })
    .order('name', { ascending: true })

  if (!withCategory?.error) return withCategory

  const fallback = await supabase
    .from('products')
    .select('id, name, price, stock, is_sub_product, image_url')
    .eq('store_id', storeId)
    .order('is_sub_product', { ascending: true })
    .order('name', { ascending: true })

  return fallback?.error ? withCategory : fallback
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

  const theme = normalizeTheme(store.theme_color)

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
      <div className="store-theme" data-store-theme={theme}>
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
      </div>
    )
  }

  const [{ data: products }, { data: tableRow }] = await Promise.all([
    loadProducts(supabase, store.id),
    supabase
      .from('store_tables')
      .select('table_number, label, note')
      .eq('store_id', store.id)
      .eq('table_number', tableNumber)
      .maybeSingle(),
  ])

  return (
    <div className="store-theme" data-store-theme={normalizeTheme(store.theme_color)}>
      <TableOrderClient
        store={{
          id: store.id,
          name: store.name,
          address: store.address,
          logoUrl: store.logo_url || null,
        }}
        tableNumber={tableNumber}
        tableLabel={tableRow?.label || tableRow?.note || null}
        products={products || []}
        serviceFee={TABLE_SERVICE_FEE_IDR}
      />
    </div>
  )
}
