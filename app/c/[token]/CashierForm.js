'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { submitTransaction } from './actions'

// Fungsi kompresi gambar menggunakan Canvas HTML5
function compressImage(file) {
  return new Promise((resolve, reject) => {
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
          if (!blob) {
            resolve(file) // fallback
            return
          }
          const newFile = new File([blob], file.name || 'photo.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(newFile)
        }, 'image/jpeg', 0.7)
      }
      img.onerror = () => resolve(file) // fallback
    }
    reader.onerror = () => resolve(file) // fallback
  })
}

export default function CashierForm({ cashierId, storeId, token }) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [items, setItems] = useState([{ name: '', qty: 1 }])
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, { name: '', qty: 1 }])
  }

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index)
    if (newItems.length === 0) newItems.push({ name: '', qty: 1 })
    setItems(newItems)
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFileName(selectedFile.name)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Gabungkan item menjadi satu string (contoh: "2x Nasi Goreng, 1x Es Teh")
    const combinedProductName = items
      .filter(item => item.name.trim() !== '')
      .map(item => `${item.qty}x ${item.name.trim()}`)
      .join(', ')

    if (!combinedProductName) {
      setMessage({ type: 'error', text: 'Minimal satu produk harus diisi.' })
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
    
    const rawFile = fileRef.current?.files?.[0]
    if (rawFile && paymentMethod === 'QRIS/TF') {
      try {
        const compressedFile = await compressImage(rawFile)
        formData.append('receipt', compressedFile)
      } catch (err) {
        console.error("Compression error:", err)
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
        <label>Total Nominal (Rp)</label>
        <input 
          type="number" 
          className="input-field" 
          value={amount} 
          onChange={e => setAmount(e.target.value)} 
          required 
          min="1"
          placeholder="Misal: 50000"
        />
      </div>

      <div className="input-group">
        <label>Daftar Produk</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="number" 
                className="input-field" 
                value={item.qty} 
                onChange={e => handleItemChange(index, 'qty', parseInt(e.target.value) || 1)} 
                min="1"
                style={{ width: '70px', padding: '0.5rem' }}
                title="Kuantitas"
                required
              />
              <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>x</span>
              <input 
                type="text" 
                className="input-field" 
                value={item.name} 
                onChange={e => handleItemChange(index, 'name', e.target.value)} 
                placeholder="Nama Produk"
                style={{ flex: 1, padding: '0.5rem' }}
                required
              />
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

      {paymentMethod === 'QRIS/TF' && (
        <div className="input-group animate-fade-in">
          <label>Upload Bukti Pembayaran</label>
          <input 
            type="file" 
            ref={fileRef}
            className="input-field" 
            accept="image/*"
            onChange={handleFileChange}
            required
            style={{ padding: '0.5rem' }}
          />
          {fileName && (
            <p style={{ fontSize: '0.75rem', color: 'var(--success-color)', margin: 0 }}>
              ✓ Foto terpilih: {fileName}
            </p>
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Foto akan dikompres otomatis saat dikirim agar cepat dan hemat kuota.
          </p>
        </div>
      )}

      <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.125rem' }}>
        {loading ? 'Mengirim & Mengompres Data...' : 'Kirim Laporan'}
      </button>
    </form>
  )
}
