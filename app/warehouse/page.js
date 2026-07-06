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
        { id: 1, name: 'Produk A', stock: 50, price: 10000 },
        { id: 2, name: 'Produk B', stock: 30, price: 15000 },
        { id: 3, name: 'Produk C', stock: 25, price: 25000 },
        { id: 4, name: 'Produk D', stock: 100, price: 8000 },
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produk
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stok
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
                      <div className="text-sm text-gray-900">Rp {product.price.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="0"
                          value={product.stock}
                          onChange={(e) => updateStock(product.id, e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => saveStock(product.id)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors duration-200"
                      >
                        Simpan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
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
