import { createClient } from '@/utils/supabase/server'
import { Package } from 'lucide-react'
import { verifySession, getMyStore } from '@/lib/dal'
import { collectCategories } from '@/lib/catalog'
import Alert from '@/components/ui/Alert'
import EmptyState from '@/components/ui/EmptyState'
import OnboardingChecklist from '../OnboardingChecklist'
import ProductForm from './ProductForm'
import ProductRow from './ProductRow'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Gudang Produk',
}

/**
 * Daftar produk toko.
 *
 * Tiga perubahan:
 *
 * 1. `supabase.auth.getUser()` + select `stores` mentah -> verifySession() dan
 *    getMyStore() dari DAL. Query lama memakai `select('*')` lalu mengambil
 *    `stores[0]`, yang mengulang logika "toko mana yang aktif" di tempat kedua;
 *    kalau urutannya nanti berubah di satu tempat saja, dua halaman menampilkan
 *    toko yang berbeda.
 *
 * 2. "Anda belum memiliki toko." tanpa jalan keluar -> OnboardingChecklist yang
 *    sama dengan /dashboard (temuan K5). Kalimat itu benar tapi tidak berguna:
 *    pengguna baru tidak tahu bahwa toko dibuat di /dashboard/settings.
 *
 * 3. Baris tabel pindah ke ProductRow, komponen client. Sebelumnya dua <form
 *    action={serverFn}> dirender langsung di sini dan hasil action-nya
 *    dibuang — setiap penolakan terlihat seperti berhasil (temuan L2).
 *
 * `title` di metadata tidak lagi menulis " - Yandihan" sendiri: root layout
 * sudah memakai template `%s | ${SITE_NAME}`, jadi versi lama menghasilkan
 * "Gudang Produk - Yandihan | Yandihan Kasir".
 */
export default async function GudangProduk() {
  await verifySession('/dashboard/produk')

  const store = await getMyStore()

  if (!store) {
    return (
      <div className="animate-fade-in flex flex-col gap-4">
        <OnboardingChecklist store={null} />
      </div>
    )
  }

  const supabase = await createClient()
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, price, stock, is_sub_product, image_url, category, created_at')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  // Kolom `category` baru ada setelah migrasi 0023. Kalau belum ada, produknya
  // tetap ditampilkan (tanpa kategori) supaya pemilik bisa tetap berjualan --
  // errornya diberitahukan supaya migrasi bisa dijalankan.
  let productRows = products || []
  let needsCategoryMigration = false

  if (productsError) {
    const fallback = await supabase
      .from('products')
      .select('id, name, price, stock, is_sub_product, image_url, created_at')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })

    if (!fallback.error) {
      productRows = fallback.data || []
      needsCategoryMigration = true
    }
  }

  // Kategori yang sudah dipakai toko, dipakai sebagai pilihan cepat di form
  // tambah produk dan di baris produk. Tidak perlu tabel kategori sendiri:
  // kategori yang belum dipakai produk mana pun tidak berguna.
  const categories = collectCategories(productRows)

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <h2>Gudang Produk</h2>

      {needsCategoryMigration && (
        <Alert variant="warning" live={false}>
          Kolom kategori produk belum tersedia. Jalankan migrasi 0023 di Supabase untuk
          mengelompokkan menu per kategori.
        </Alert>
      )}

      <section className="card">
        <h3>Tambah Produk Baru</h3>
        <ProductForm storeId={store.id} categories={categories} />
      </section>

      <section className="card">
        <h3>Daftar Produk ({productRows.length})</h3>
        {productRows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nama Produk</th>
                  <th>Kategori</th>
                  <th>Harga Satuan</th>
                  <th>Stok</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((product) => (
                  <ProductRow key={product.id} product={product} categories={categories} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Package size={32} aria-hidden="true" />}
            title="Belum ada produk"
          >
            Tambahkan minimal satu produk lewat form di atas supaya kasir punya
            sesuatu untuk dijual.
          </EmptyState>
        )}
      </section>
    </div>
  )
}
