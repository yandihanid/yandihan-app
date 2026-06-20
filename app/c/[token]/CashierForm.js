'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { submitTransaction } from './actions'

// Fungsi kompresi gambar menggunakan Canvas HTML5
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

const LEGACY_STORAGE_KEY = 'yandihan_cashier_form'

function getStorageKey(token) {
  return `yandihan_cashier_form_${token}`
}

function loadSavedForm(token) {
  if (typeof window === 'undefined') return null
  try {
    const key = getStorageKey(token)
    let saved = sessionStorage.getItem(key)
    if (!saved) {
      saved = sessionStorage.getItem(LEGACY_STORAGE_KEY)
      if (saved) {
        sessionStorage.setItem(key, saved)
        sessionStorage.removeItem(LEGACY_STORAGE_KEY)
      }
    }
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function hasSavedFormData(data) {
  if (!data) return false
  return !!(
    data.amount ||
    data.paymentMethod === 'QRIS/TF' ||
    data.fileName ||
    data.receiptDataUrl ||
    data.items?.some(item => item.name?.trim())
  )
}

function dataUrlToFile(dataUrl, name) {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
  return new File([array], name || 'photo.jpg', { type: mime, lastModified: Date.now() })
}

export default function CashierForm({ cashierId, storeId, token }) {
  const router = useRouter()
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const savedOnInit = useRef(loadSavedForm(token))
  const [restored, setRestored] = useState(() => hasSavedFormData(savedOnInit.current))
  const [hydrated, setHydrated] = useState(false)

  const [amount, setAmount] = useState(() => savedOnInit.current?.amount ?? '')
  const [items, setItems] = useState(() => savedOnInit.current?.items ?? [{ name: '', qty: 1 }])
  const [paymentMethod, setPaymentMethod] = useState(() => savedOnInit.current?.paymentMethod ?? 'CASH')
  const [fileName, setFileName] = useState(() => savedOnInit.current?.fileName ?? '')
  const [receiptDataUrl, setReceiptDataUrl] = useState(() => savedOnInit.current?.receiptDataUrl ?? null)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const saveForm = useCallback(() => {
    const payload = { amount, items, paymentMethod, fileName, receiptDataUrl }
    const key = getStorageKey(token)
    try {
      sessionStorage.setItem(key, JSON.stringify(payload))
    } catch {
      try {
        sessionStorage.setItem(key, JSON.stringify({ amount, items, paymentMethod, fileName }))
      } catch { /* ignore */ }
    }
  }, [amount, items, paymentMethod, fileName, receiptDataUrl, token])

  useEffect(() => {
    if (!hydrated) return
    saveForm()
  }, [hydrated, saveForm])

  useEffect(() => {
    if (!hydrated) return

    const persist = () => saveForm()
    window.addEventListener('pagehide', persist)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persist()
    })

    return () => {
      window.removeEventListener('pagehide', persist)
    }
  }, [hydrated, saveForm])

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

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFileName(selectedFile.name)
    setRestored(false)

    const persistReceipt = (dataUrl) => {
      setReceiptDataUrl(dataUrl)
      try {
        sessionStorage.setItem(getStorageKey(token), JSON.stringify({
          amount, items, paymentMethod, fileName: selectedFile.name, receiptDataUrl: dataUrl
        }))
      } catch {
        try {
          sessionStorage.setItem(getStorageKey(token), JSON.stringify({
            amount, items, paymentMethod, fileName: selectedFile.name
          }))
        } catch { /* ignore */ }
      }
    }

    // Simpan mentah dulu — browser sering reload sebelum kompresi selesai
    const quickReader = new FileReader()
    quickReader.onload = () => persistReceipt(quickReader.result)
    quickReader.readAsDataURL(selectedFile)

    try {
      const compressed = await compressImage(selectedFile)
      const reader = new FileReader()
      reader.onload = () => persistReceipt(reader.result)
      reader.readAsDataURL(compressed)
    } catch { /* raw backup sudah tersimpan di atas */ }
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
      } catch (err) {
        formData.append('receipt', rawFile)
      }
    }

    const result = await submitTransaction(formData)
    
    setLoading(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      sessionStorage.removeItem(getStorageKey(token))
      sessionStorage.removeItem(LEGACY_STORAGE_KEY)
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

      {restored && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          backgroundColor: '#fef3c7',
          color: '#92400e',
          fontSize: '0.875rem'
        }}>
          ⚠️ Halaman dimuat ulang oleh browser. Isian formulir telah dipulihkan{receiptDataUrl ? ', termasuk foto bukti' : ''}. {receiptDataUrl ? '' : 'Silakan pilih ulang foto bukti pembayaran jika diperlukan.'}
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
          onChange={e => setPaymentMethod(e.target.value)}
        >
          <option value="CASH">CASH (Tunai)</option>
          <option value="QRIS/TF">QRIS / Transfer Bank</option>
        </select>
      </div>

      {/* File input SELALU di-render, di-hide pakai CSS saat CASH */}
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
