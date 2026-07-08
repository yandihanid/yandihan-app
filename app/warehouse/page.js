'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WarehousePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // modal state for editing stock
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingStock, setEditingStock] = useState('');

  // Mock data – in a real app this would come from an API
  useEffect(() => {
    setTimeout(() => {
      setProducts([
        {
          id: 1,
          name: 'Beras 5kg',
          price: 60000,
          stock: 10,
        },
        {
          id: 2,
          name: 'Gula Pasir 1kg',
          price: 15000,
          stock: 25,
        },
        {
          id: 3,
          name: 'Minyak Goreng 1L',
          price: 20000,
          stock: 8,
        },
        {
          id: 4,
          name: 'Telur 1kg',
          price: 30000,
          stock: 0,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const deleteProduct = (productId) => {
    setProducts(products.filter((product) => product.id !== productId));
  };

  const openEditStock = (product) => {
    setEditingProductId(product.id);
    setEditingStock(String(product.stock));
  };

  const closeEditStock = () => {
    setEditingProductId(null);
    setEditingStock('');
  };

  const saveStock = () => {
    const newStock = parseInt(editingStock, 10);
    if (isNaN(newStock) || newStock < 0) {
      alert('Stok harus berupa angka non-negatif');
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === editingProductId ? { ...p, stock: newStock } : p
      )
    );
    closeEditStock();
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '1.5rem',
        }}
      >
        Memuat data gudang...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Gudang Produk</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '1rem',
              backgroundColor: '#fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0' }}>{product.name}</h3>
            <p style={{ margin: '0.25rem 0' }}>
              <strong>Harga:</strong> Rp {product.price.toLocaleString('id-ID')}
            </p>
            <p style={{ margin: '0.25rem 0' }}>
              <strong>Stok:</strong>{' '}
              <span
                style={{
                  color: product.stock === 0 ? 'red' : product.stock < 5 ? 'orange' : 'green',
                  fontWeight: 'bold',
                }}
              >
                {product.stock}
              </span>
            </p>
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                marginTop: '0.75rem',
              }}
            >
              <button
                onClick={() => openEditStock(product)}
                style={{
                  padding: '0.4rem 1rem',
                  backgroundColor: '#0070f3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Edit Stok
              </button>
              <button
                onClick={() => deleteProduct(product.id)}
                style={{
                  padding: '0.4rem 1rem',
                  backgroundColor: '#e53e3e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal untuk mengedit stok */}
      {editingProductId !== null && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={closeEditStock}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '2rem',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>Edit Stok</h2>
            <p style={{ margin: '0 0 1rem 0', color: '#555' }}>
              Produk: {products.find((p) => p.id === editingProductId)?.name}
            </p>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Jumlah stok baru:
            </label>
            <input
              type="number"
              min="0"
              value={editingStock}
              onChange={(e) => setEditingStock(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginBottom: '1rem',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={closeEditStock}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: '#e2e8f0',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                onClick={saveStock}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: '#0070f3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
