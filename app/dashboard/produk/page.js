import { createClient } from '@/utils/supabase/server'
import { Package } from 'lucide-react'
import { verifySession, getMyStore } from '@/lib/dal'
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
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock, created_at')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <h2>Gudang Produk</h2>

      <section className="card">
        <h3>Tambah Produk Baru</h3>
        <ProductForm storeId={store.id} />
      </section>

      <section className="card">
        <h3>Daftar Produk ({products?.length ?? 0})</h3>
        {products?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nama Produk</th>
                  <th>Harga Satuan</th>
                  <th>Stok</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <ProductRow key={product.id} product={product} />
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
