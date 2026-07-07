'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WarehousePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Mock data - in a real app this would come from an API
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setProducts([
        { id: 1, name: 'Produk A', stock: 50, price: 10000, category: 'Makanan' },
        { id: 2, name: 'Produk B', stock: 30, price: 15000, category: 'Minuman' },
        { id: 3, name: 'Produk C', stock: 25, price: 25000, category: 'Makanan' },
        { id: 4, name: 'Produk D', stock: 100, price: 8000, category: 'Snack' },
        { id: 5, name: 'Produk E', stock: 0, price: 12000, category: 'Minuman' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const updateStock = (productId, newStock) => {
    setProducts(products.map(product => 
      product.id === productId ? { ...product, stock: parseInt(newStock) || 0 } : product
    ));
  };

  const saveStock = async (productId) => {
    // In a real app, this would make an API call to save the stock
    console.log(`Saving stock for product ${productId}`);
    // Here you would typically make a fetch request to your backend
    // await fetch('/api/products/update-stock', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ id: productId, stock: newStock })
    // });
  };

  const addProduct = () => {
    const newProduct = {
      id: products.length + 1,
      name: 'Produk Baru',
      stock: 0,
      price: 0,
      category: 'Lainnya'
    };
    setProducts([...products, newProduct]);
  };

  const deleteProduct = (productId) => {
    setProducts(products.filter(product => product.id !== productId));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data gudang...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-color)', padding: '2rem 1rem' }}>
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Gudang Produk</h1>
          <p className="text-gray-600">Kelola stok produk Anda secara real-time</p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={addProduct}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Tambah Produk
            </button>
          </div>
          <div className="text-sm text-gray-500">
            Total Produk: {products.length}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produk
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stok
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Rp {product.price.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="0"
                          value={product.stock}
                          onChange={(e) => updateStock(product.id, e.target.value)}
                          className="w-20 px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.stock > 10 ? 'bg-green-100 text-green-800' : 
                        product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.stock > 10 ? 'Tersedia' : product.stock > 0 ? 'Sedikit' : 'Habis'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveStock(product.id)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors duration-200 text-sm"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors duration-200 text-sm"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {products.filter(p => p.stock <= 0).length} produk habis stok
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
}
