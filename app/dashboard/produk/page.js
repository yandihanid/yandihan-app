import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ProductForm from './ProductForm'
import { updateStock, deleteProduct } from './actions'

export const metadata = {
  title: 'Gudang Produk - Yandihan'
}

export default async function GudangProduk() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: stores } = await supabase.from('stores').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
  if (!stores || stores.length === 0) {
    return (
      <div className="card">
        <h2>Gudang Produk</h2>
        <p>Anda belum memiliki toko.</p>
      </div>
    )
  }
  const activeStore = stores[0]
  const { data: products } = await supabase.from('products').select('*').eq('store_id', activeStore.id).order('created_at', { ascending: false })

  return (
    <div className="animate-fade-in">
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Gudang Produk</h2>
        <p>Atur produk dan harga di sini.</p>
        <div style={{ marginTop: '2rem' }}>
          <h3>Tambah Produk Baru</h3>
          <ProductForm storeId={activeStore.id} />
        </div>
      </div>
      <div className="card">
        <h3>Daftar Produk ({products?.length || 0})</h3>
        {products && products.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nama Produk</th>
                  <th>Harga Satuan</th>
                  <th>Stok</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => (
                  <tr key={prod.id}>
                    <td style={{ fontWeight: 500 }}>{prod.name}</td>
                    <td>Rp {parseInt(prod.price).toLocaleString('id-ID')}</td>
                    <td>{prod.stock ?? 0}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <form action={updateStock} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="hidden" name="productId" value={prod.id} />
                        <input type="number" name="newStock" min="0" defaultValue={prod.stock ?? 0} style={{ width: 60, padding: '0.2rem', fontSize: '0.875rem', border: '1px solid #ccc', borderRadius: 4 }} />
                        <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', fontWeight: 500, fontSize: '0.875rem' }}>Simpan</button>
                      </form>
                      <form action={deleteProduct} style={{ display: 'inline-block', marginLeft: '0.5rem' }}>
                        <input type="hidden" name="productId" value={prod.id} />
                        <button type="submit" style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>Hapus</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Belum ada produk.</p>
        )}
      </div>
    </div>
  )
}
