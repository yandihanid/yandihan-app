'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { submitTransaction } from './actions'

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = document.createElement('img')
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 800
        const MAX_HEIGHT = 800
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name || 'photo.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          }))
        }, 'image/jpeg', 0.7)
      }
      img.onerror = () => resolve(file)
    }
    reader.onerror = () => resolve(file)
  })
}

function dataUrlToFile(dataUrl, name) {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
  return new File([array], name || 'photo.jpg', { type: mime, lastModified: Date.now() })
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function CashierForm({ cashierId, storeId, token, products = [] }) {
  const router = useRouter()
  const fileRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const [amount, setAmount] = useState('')
  const [items, setItems] = useState([{ name: '', qty: 1 }])
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [fileName, setFileName] = useState('')
  const [receiptDataUrl, setReceiptDataUrl] = useState(null)

  // Fungsi untuk mereset seluruh formulir ke kondisi awal
  const resetForm = () => {
    setAmount('');
    setItems([{ name: '', qty: 1 }]);
    setPaymentMethod('CASH');
    setFileName('');
    setReceiptDataUrl(null);
    if (fileRef.current) fileRef.current.value = ''; // Hapus file dari input
    setMessage(null);
  }

  // Efek untuk mereset formulir saat komponen dimuat (misal: halaman dibuka/kembali dari struk)
  useEffect(() => {
    resetForm();
  }, [token]); // Reset setiap kali token kasir berubah (atau saat komponen di-mount ulang)


  // Calculate total automatically
  const calculateTotal = (currentItems) => {
    if (!products || products.length === 0) return amount;
    let total = 0;
    let autoCalcPossible = false;
    
    currentItems.forEach(item => {
      const prod = products.find(p => p.name === item.name);
      if (prod) {
        total += (parseFloat(prod.price) || 0) * (parseInt(item.qty) || 0);
        autoCalcPossible = true;
      }
    });

    return autoCalcPossible && total > 0 ? String(total) : amount;
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
    
    const newAmount = calculateTotal(newItems);
    if (newAmount !== amount) {
      setAmount(newAmount)
    }
  }

  const addItem = () => {
    const newItems = [...items, { name: '', qty: 1 }]
    setItems(newItems)
  }

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index)
    if (newItems.length === 0) newItems.push({ name: '', qty: 1 })
    setItems(newItems)
    
    const newAmount = calculateTotal(newItems);
    if (newAmount !== amount) {
      setAmount(newAmount)
    }
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) {
      setFileName('');
      setReceiptDataUrl(null);
      return;
    }

    const nextFileName = selectedFile.name
    setFileName(nextFileName)
    setReceiptDataUrl(null) // Clear previous Data URL while compressing

    try {
      const compressed = await compressImage(selectedFile)
      const dataUrl = await readFileAsDataUrl(compressed)
      setReceiptDataUrl(dataUrl)
    } catch {
      try {
        const dataUrl = await readFileAsDataUrl(selectedFile)
        setReceiptDataUrl(dataUrl)
      } catch { /* ignore */ }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const combinedProductName = items
      .filter(item => item.name.trim() !== '')
      .map(item => `${item.qty}x ${item.name.trim()}`)
      .join(', ')

    if (!combinedProductName) {
      setMessage({ type: 'error', text: 'Minimal satu produk harus diisi.' })
      setLoading(false)
      return
    }

    let rawFile = fileRef.current?.files?.[0]
    if (!rawFile && receiptDataUrl) {
      rawFile = dataUrlToFile(receiptDataUrl, fileName)
    }
    if (paymentMethod === 'QRIS/TF' && !rawFile) {
      setMessage({ type: 'error', text: 'Silakan pilih ulang foto bukti pembayaran.' })
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('cashierId', cashierId)
    formData.append('storeId', storeId)
    formData.append('token', token)
    formData.append('amount', amount)
    formData.append('productName', combinedProductName)
    formData.append('paymentMethod', paymentMethod)

    if (rawFile && paymentMethod === 'QRIS/TF') {
      try {
        const compressedFile = await compressImage(rawFile)
        formData.append('receipt', compressedFile)
      } catch {
        formData.append('receipt', rawFile)
      }
    }

    const result = await submitTransaction(formData)

    setLoading(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      router.push(`/r/${result.transactionId}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: message.type === 'error' ? '#f8d7da' : '#d1fae5',
          color: message.type === 'error' ? '#842029' : '#0f5132'
        }}>
          {message.text}
        </div>
      )}

      <div className="input-group">
        <label>Daftar Produk</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Dropdown Kuantitas */}
              <select
                className="input-field"
                value={item.qty}
                onChange={e => handleItemChange(index, 'qty', parseInt(e.target.value) || 1)}
                style={{ width: '70px', padding: '0.5rem' }}
                title="Kuantitas"
                required
              >
                {[...Array(10).keys()].map(i => ( // Opsi 1 hingga 10
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
              <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>x</span>
              
              {products && products.length > 0 ? (
                <select 
                  className="input-field"
                  value={item.name}
                  onChange={e => handleItemChange(index, 'name', e.target.value)}
                  style={{ flex: 1, padding: '0.5rem' }}
                  required
                >
                  <option value="" disabled>Pilih Produk</option>
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name} (Rp {parseInt(p.price).toLocaleString('id-ID')})</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="input-field"
                  value={item.name}
                  onChange={e => handleItemChange(index, 'name', e.target.value)}
                  placeholder="Nama Produk"
                  style={{ flex: 1, padding: '0.5rem' }}
                  required
                />
              )}

              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(index)} style={{ padding: '0.5rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem' }}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          style={{
            marginTop: '0.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: 'var(--primary-color)',
            background: 'none',
            border: 'none',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          + Tambah Produk Lain
        </button>
      </div>

      <div className="input-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Total Nominal (Rp)
          {products && products.length > 0 && (
            <span style={{ fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.1rem 0.5rem', borderRadius: '99px', fontWeight: '600' }}>otomatis</span>
          )}
        </label>
        <input
          type="number"
          className="input-field"
          value={amount}
          onChange={e => {
            if (products && products.length > 0) return // readonly when products exist
            setAmount(e.target.value)
          }}
          readOnly={products && products.length > 0}
          required
          min="1"
          placeholder={products && products.length > 0 ? 'Pilih produk & kuantitas untuk menghitung...' : 'Misal: 50000'}
          style={products && products.length > 0 ? { backgroundColor: '#f8fafc', cursor: 'default', color: 'var(--text-muted)' } : {}}
        />
        {products && products.length > 0 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>💡 Total dihitung otomatis dari pilihan produk di atas.</p>
        )}
      </div>

      <div className="input-group">
        <label>Metode Pembayaran</label>
        <select
          className="input-field"
          value={paymentMethod}
          onChange={e => {
            setPaymentMethod(e.target.value)
          }}
        >
          <option value="CASH">CASH (Tunai)</option>
          <option value="QRIS/TF">QRIS / Transfer Bank</option>
        </select>
      </div>

      <div className="input-group" style={{ display: paymentMethod === 'QRIS/TF' ? 'flex' : 'none' }}>
        <label>Upload Bukti Pembayaran</label>
        <input
          type="file"
          ref={fileRef}
          className="input-field"
          accept="image/*"
          onChange={handleFileChange}
          style={{ padding: '0.5rem' }}
        />
        {fileName && (
          <p style={{ fontSize: '0.75rem', color: 'var(--success-color)', margin: 0 }}>
            ✓ Foto terpilih: {fileName}
          </p>
        )}
        {receiptDataUrl && (
          <div style={{ marginTop: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
            <p style={{ margin: '0.5rem 0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Preview Foto Bukti:</p>
            <img src={receiptDataUrl} alt="Bukti Pembayaran" style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
            <button
              type="button"
              onClick={() => {
                setReceiptDataUrl(null);
                setFileName('');
                if (fileRef.current) fileRef.current.value = ''; // Clear file input
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                borderTop: '1px solid var(--border-color)'
              }}
            >
              Hapus Foto Ini
            </button>
          </div>
        )}
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
          Foto akan dikompres otomatis saat dikirim agar cepat dan hemat kuota.
        </p>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.125rem' }}>
        {loading ? 'Mengirim & Mengompres Data...' : 'Kirim Laporan'}
      </button>
    </form>
  )
}
