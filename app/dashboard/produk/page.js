import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ProductForm from './ProductForm'

export const metadata = {
  title: 'Gudang Produk - Yandihan'
}

export default async function GudangProduk() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Ambil store pertama milik user
  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (!stores || stores.length === 0) {
    return (
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Gudang Produk</h2>
        <p>Anda belum memiliki toko.</p>
      </div>
    )
  }

  const activeStore = stores[0]

  // Ambil produk
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', activeStore.id)
    .order('created_at', { ascending: false })

  return (
    <div className="animate-fade-in">
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Gudang Produk</h2>
        <p style={{ color: 'var(--text-muted)' }}>Atur produk dan harga di sini agar kasir tinggal memilih produk tanpa repot mengetik.</p>
        
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Tambah Produk Baru</h3>
          <ProductForm storeId={activeStore.id} />
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Daftar Produk ({products?.length || 0})</h3>
        
        {products && products.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nama Produk</th>
                  <th>Harga Satuan</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => (
                  <tr key={prod.id}>
                    <td style={{ fontWeight: '500' }}>{prod.name}</td>
                    <td>Rp {parseInt(prod.price).toLocaleString('id-ID')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <form action={async () => {
                        'use server'
                        const sb = await createClient()
                        await sb.from('products').delete().eq('id', prod.id)
                        redirect('/dashboard/produk')
                      }}>
                        <button type="submit" style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.875rem' }}>
                          Hapus
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
            <p style={{ color: 'var(--text-muted)' }}>Belum ada produk. Tambahkan produk pertama Anda!</p>
          </div>
        )}
      </div>
    </div>
  )
}
