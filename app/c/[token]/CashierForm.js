'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
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

const LEGACY_STORAGE_KEY = 'yandihan_cashier_form'
const STORAGE_PREFIX = 'yandihan_cashier_form_'

function getStorageKey(token) {
  return `${STORAGE_PREFIX}${token}`
}

function readFromStores(key) {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const saved = store.getItem(key)
      if (saved) return JSON.parse(saved)
    } catch { /* ignore */ }
  }
  return null
}

function loadSavedForm(token) {
  if (typeof window === 'undefined') return null

  const key = getStorageKey(token)
  let data = readFromStores(key)

  if (!data) {
    const legacy = readFromStores(LEGACY_STORAGE_KEY)
    if (legacy) {
      writeToStores(key, legacy)
      clearFormStores(LEGACY_STORAGE_KEY)
      data = legacy
    }
  }

  return data
}

function writeToStores(key, payload) {
  const textOnly = {
    amount: payload.amount,
    items: payload.items,
    paymentMethod: payload.paymentMethod,
    fileName: payload.fileName,
    savedAt: Date.now(),
  }

  for (const store of [localStorage, sessionStorage]) {
    try {
      store.setItem(key, JSON.stringify(payload))
      // #region agent log
      fetch('http://127.0.0.1:7449/ingest/967cd299-60b4-494c-a62c-d11cf5e270f9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5a0991'},body:JSON.stringify({sessionId:'5a0991',hypothesisId:'H5',location:'CashierForm.js:writeToStores',message:'storage write ok',data:{store:store===localStorage?'localStorage':'sessionStorage',mode:'full',amount:payload.amount,paymentMethod:payload.paymentMethod,hasFileName:!!payload.fileName,hasReceipt:!!payload.receiptDataUrl,receiptLen:payload.receiptDataUrl?.length||0},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return 'full'
    } catch (err) {
      try {
        store.setItem(key, JSON.stringify(textOnly))
        // #region agent log
        fetch('http://127.0.0.1:7449/ingest/967cd299-60b4-494c-a62c-d11cf5e270f9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5a0991'},body:JSON.stringify({sessionId:'5a0991',hypothesisId:'H5',location:'CashierForm.js:writeToStores',message:'storage write text-only fallback',data:{store:store===localStorage?'localStorage':'sessionStorage',err:String(err),amount:textOnly.amount,paymentMethod:textOnly.paymentMethod},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return 'text'
      } catch { /* ignore */ }
    }
  }
  // #region agent log
  fetch('http://127.0.0.1:7449/ingest/967cd299-60b4-494c-a62c-d11cf5e270f9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5a0991'},body:JSON.stringify({sessionId:'5a0991',hypothesisId:'H5',location:'CashierForm.js:writeToStores',message:'storage write failed both stores',data:{amount:payload.amount,paymentMethod:payload.paymentMethod},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return null
}

function clearFormStores(tokenOrKey) {
  const key = tokenOrKey.startsWith(STORAGE_PREFIX) ? tokenOrKey : getStorageKey(tokenOrKey)
  for (const store of [localStorage, sessionStorage]) {
    try {
      store.removeItem(key)
      store.removeItem(LEGACY_STORAGE_KEY)
    } catch { /* ignore */ }
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
  const readyRef = useRef(false)
  const instanceId = useRef(`cf-${Math.random().toString(36).slice(2, 8)}`)
  const mountCount = useRef(0)
  const formRef = useRef({
    amount: '',
    items: [{ name: '', qty: 1 }],
    paymentMethod: 'CASH',
    fileName: '',
    receiptDataUrl: null,
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [ready, setReady] = useState(false)
  const [restored, setRestored] = useState(false)

  const [amount, setAmount] = useState('')
  const [items, setItems] = useState([{ name: '', qty: 1 }])
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [fileName, setFileName] = useState('')
  const [receiptDataUrl, setReceiptDataUrl] = useState(null)

  formRef.current = { amount, items, paymentMethod, fileName, receiptDataUrl }

  const persistForm = useCallback((override = {}) => {
    if (!readyRef.current) return

    const data = { ...formRef.current, ...override, savedAt: Date.now() }
    writeToStores(getStorageKey(token), data)
  }, [token])

  // Pulihkan dari storage
  useLayoutEffect(() => {
    mountCount.current += 1
    const saved = loadSavedForm(token)
    
    if (saved) {
      if (saved.amount != null) setAmount(String(saved.amount))
      if (saved.items?.length) setItems(saved.items)
      if (saved.paymentMethod) setPaymentMethod(saved.paymentMethod)
      if (saved.fileName) setFileName(saved.fileName)
      if (saved.receiptDataUrl) setReceiptDataUrl(saved.receiptDataUrl)
      if (hasSavedFormData(saved)) setRestored(true)
    }

    readyRef.current = true
    setReady(true)
  }, [token])

  useEffect(() => {
    if (!ready) return
    writeToStores(getStorageKey(token), { ...formRef.current, savedAt: Date.now() })
  }, [ready, amount, items, paymentMethod, fileName, receiptDataUrl, token])

  useEffect(() => {
    if (!ready) return

    const flush = () => {
      persistForm()
    }
    const onPageShow = (e) => {}
    
    window.addEventListener('pagehide', flush)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })

    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [ready, persistForm])

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
      readyRef.current && persistForm({ items: newItems, amount: newAmount })
    } else {
      readyRef.current && persistForm({ items: newItems })
    }
  }

  const addItem = () => {
    const newItems = [...items, { name: '', qty: 1 }]
    setItems(newItems)
    readyRef.current && persistForm({ items: newItems })
  }

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index)
    if (newItems.length === 0) newItems.push({ name: '', qty: 1 })
    setItems(newItems)
    
    const newAmount = calculateTotal(newItems);
    if (newAmount !== amount) {
      setAmount(newAmount)
      readyRef.current && persistForm({ items: newItems, amount: newAmount })
    } else {
      readyRef.current && persistForm({ items: newItems })
    }
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const nextFileName = selectedFile.name
    setFileName(nextFileName)
    setRestored(false)

    readyRef.current && persistForm({ fileName: nextFileName, receiptDataUrl: null })

    try {
      const compressed = await compressImage(selectedFile)
      const dataUrl = await readFileAsDataUrl(compressed)
      setReceiptDataUrl(dataUrl)
      readyRef.current && persistForm({ fileName: nextFileName, receiptDataUrl: dataUrl })
    } catch {
      try {
        const dataUrl = await readFileAsDataUrl(selectedFile)
        setReceiptDataUrl(dataUrl)
        readyRef.current && persistForm({ fileName: nextFileName, receiptDataUrl: dataUrl })
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
      clearFormStores(token)
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
          ⚠️ Halaman dimuat ulang oleh browser. Isian formulir telah dipulihkan{receiptDataUrl ? ', termasuk foto bukti' : ''}.{receiptDataUrl ? '' : ' Silakan pilih ulang foto bukti pembayaran jika diperlukan.'}
        </div>
      )}

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
        <label>Total Nominal (Rp)</label>
        <input
          type="number"
          className="input-field"
          value={amount}
          onChange={e => {
            setAmount(e.target.value)
            readyRef.current && persistForm({ amount: e.target.value })
          }}
          required
          min="1"
          placeholder="Misal: 50000"
        />
      </div>

      <div className="input-group">
        <label>Metode Pembayaran</label>
        <select
          className="input-field"
          value={paymentMethod}
          onChange={e => {
            setPaymentMethod(e.target.value)
            readyRef.current && persistForm({ paymentMethod: e.target.value })
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
