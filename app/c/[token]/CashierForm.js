'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { submitTransaction } from './actions'

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 800
        const MAX_HEIGHT = 800
        let { width, height } = img
        if (width > height && width > MAX_WIDTH) {
          height *= MAX_WIDTH / width
          width = MAX_WIDTH
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height
          height = MAX_HEIGHT
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => resolve(blob ? new File([blob], file.name || 'photo.jpg', { type: 'image/jpeg', lastModified: Date.now() }) : file),
          'image/jpeg',
          0.7
        )
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

export default function CashierForm({
  cashierId,
  storeId,
  token,
  products = [],
  receiptRequired = true,
  discountPercent = 0,
  customerName = '',
  customerPhone = '',
  requireSubProduct = false,
  requireCustomerName = false,
}) {
  const router = useRouter()
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [amount, setAmount] = useState('')
  const [items, setItems] = useState([{ name: '', qty: 1, subs: [] }])
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [fileName, setFileName] = useState('')
  const [receiptDataUrl, setReceiptDataUrl] = useState(null)
  const [receiptCacheUrl, setReceiptCacheUrl] = useState(null)
  const [cashReceived, setCashReceived] = useState('')
  const [changeAmount, setChangeAmount] = useState(0)
  const [buyerName, setBuyerName] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [offlineQueue, setOfflineQueue] = useState([])
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
    setIsOnline(navigator.onLine)
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const queueKey = `yandihan_offline_queue_${token}`
    setOfflineQueue(JSON.parse(localStorage.getItem(queueKey) || '[]'))
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [token])

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0 && !syncing) syncQueue()
  }, [isOnline, offlineQueue, syncing])

  const resetForm = () => {
    setAmount('')
    setItems([{ name: '', qty: 1, subs: [] }])
    setPaymentMethod('CASH')
    setFileName('')
    setReceiptDataUrl(null)
    setReceiptCacheUrl(null)
    if (fileRef.current) fileRef.current.value = ''
    setMessage(null)
    setCashReceived('')
    setChangeAmount(0)
    setBuyerName('')
  }

  const calculateTotal = (currentItems) => {
    if (!products.length) return amount
    let total = 0
    let auto = false
    currentItems.forEach((item) => {
      const prod = products.find((p) => p.name === item.name)
      if (prod) {
        total += prod.price * item.qty
        auto = true
      }
      if (requireSubProduct) {
        item.subs?.forEach((sub) => {
          const sp = products.find((p) => p.name === sub.name)
          if (sp) {
            total += sp.price * sub.qty
            auto = true
          }
        })
      }
    })
    return auto && total > 0 ? String(total) : amount
  }

  const discountAmount = discountPercent > 0 && amount ? Math.round((amount * discountPercent) / 100) : 0
  const finalAmount = amount ? Math.max(0, amount - discountAmount) : 0

  useEffect(() => {
    const received = parseFloat(cashReceived)
    setChangeAmount(!isNaN(received) && received >= finalAmount ? received - finalAmount : 0)
  }, [amount, cashReceived, discountPercent])

  const updateItems = (newItems) => {
    setItems(newItems)
    const newAmount = calculateTotal(newItems)
    if (newAmount !== amount) setAmount(newAmount)
  }

  const handleItemChange = (i, f, v) => {
    const ni = [...items]
    ni[i][f] = v
    updateItems(ni)
  }
  const addSub = (i) => {
    const ni = [...items]
    ni[i].subs = [...(ni[i].subs || []), { name: '', qty: 1 }]
    updateItems(ni)
  }
  const removeSub = (i, si) => {
    const ni = [...items]
    ni[i].subs = ni[i].subs.filter((_, x) => x !== si)
    updateItems(ni)
  }
  const handleSubChange = (i, si, f, v) => {
    const ni = [...items]
    if (!ni[i].subs) ni[i].subs = []
    ni[i].subs[si][f] = v
    updateItems(ni)
  }
  const addItem = () => updateItems([...items, { name: '', qty: 1, subs: [] }])
  const removeItem = (i) => {
    const ni = items.filter((_, x) => x !== i)
    if (!ni.length) ni.push({ name: '', qty: 1, subs: [] })
    updateItems(ni)
  }

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0]
    if (!f) {
      setFileName('')
      setReceiptDataUrl(null)
      setReceiptCacheUrl(null)
      return
    }
    setFileName(f.name)
    try {
      const comp = await compressImage(f)
      const du = await readFileAsDataUrl(comp)
      setReceiptDataUrl(du)
      if ('caches' in window) {
        const cache = await caches.open('yandihan-receipts')
        await cache.put(`/receipts/bukti_${Date.now()}.jpg`, new Response(comp))
        setReceiptCacheUrl(`/receipts/bukti_${Date.now()}.jpg`)
      }
    } catch {
      try {
        setReceiptDataUrl(await readFileAsDataUrl(f))
      } catch {}
    }
  }

  const syncQueue = async () => {
    setSyncing(true)
    const queueKey = `yandihan_offline_queue_${token}`
    const queue = JSON.parse(localStorage.getItem(queueKey) || '[]')
    const remaining = []
    for (const tx of queue) {
      const fd = new FormData()
      Object.entries(tx).forEach(([k, v]) => {
        if (k !== 'receiptFile' && v !== null && v !== undefined) fd.append(k, v)
      })
      const res = await submitTransaction(fd)
      if (res.error) remaining.push(tx)
    }
    localStorage.setItem(queueKey, JSON.stringify(remaining))
    setOfflineQueue(remaining)
    setSyncing(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Validation
    if (requireCustomerName && !buyerName.trim()) {
      setMessage({ type: 'error', text: 'Nama pembeli wajib diisi.' })
      setLoading(false)
      return
    }
    if (requireSubProduct) {
      const valid = items.filter((it) => it.name.trim()).every((it) => it.subs?.some((s) => s.name.trim()))
      if (!valid) {
        setMessage({ type: 'error', text: 'Setiap produk wajib memiliki sub‑produk.' })
        setLoading(false)
        return
      }
    }
    if (paymentMethod === 'CASH') {
      const received = parseFloat(cashReceived)
      if (isNaN(received) || received < finalAmount) {
        setMessage({ type: 'error', text: 'Uang tidak cukup.' })
        setLoading(false)
        return
      }
    }

    const combined = items
      .filter((it) => it.name.trim())
      .map((it) => {
        const base = `${it.qty}x ${it.name.trim()}`
        if (!requireSubProduct) return base
        const subs = it.subs
          ?.filter((s) => s.name.trim())
          .map((s) => `${s.qty}x ${s.name.trim()}`)
          .join(' + ')
        return subs ? `${base} + ${subs}` : base
      })
      .join(', ')

    if (!combined) {
      setMessage({ type: 'error', text: 'Minimal satu produk.' })
      setLoading(false)
      return
    }

    let raw = fileRef.current?.files?.[0]
    if (!raw && receiptDataUrl) raw = dataUrlToFile(receiptDataUrl, fileName)
    if (paymentMethod === 'QRIS/TF' && receiptRequired && !raw) {
      setMessage({ type: 'error', text: 'Bukti pembayaran wajib.' })
      setLoading(false)
      return
    }

    const fd = new FormData()
    fd.append('cashierId', cashierId)
    fd.append('storeId', storeId)
    fd.append('token', token)
    fd.append('amount', String(finalAmount || amount))
    fd.append('originalAmount', amount)
    fd.append('discountPercent', String(discountPercent))
    fd.append('customerName', buyerName || customerName)
    fd.append('customerPhone', customerPhone)
    fd.append('productName', combined)
    fd.append('paymentMethod', paymentMethod)
    fd.append('buyerName', buyerName)
    if (paymentMethod === 'CASH') {
      fd.append('cashReceived', cashReceived)
      fd.append('changeAmount', String(changeAmount))
    }
    if (raw && paymentMethod === 'QRIS/TF') {
      try {
        fd.append('receipt', await compressImage(raw))
      } catch {
        fd.append('receipt', raw)
      }
    }

    try {
      const res = await submitTransaction(fd)
      if (res.error) setMessage({ type: 'error', text: res.error })
      else {
        resetForm()
        router.push(`/r/${res.transactionId}`)
      }
    } catch {
      const queueKey = `yandihan_offline_queue_${token}`
      const offlineTx = {
        cashierId, storeId, token,
        amount: String(finalAmount || amount),
        originalAmount: amount,
        discountPercent: String(discountPercent),
        customerName: buyerName || customerName,
        customerPhone,
        productName: combined,
        paymentMethod,
        buyerName,
        cashReceived: paymentMethod === 'CASH' ? cashReceived : '',
        changeAmount: paymentMethod === 'CASH' ? String(changeAmount) : '',
        receiptDataUrl: paymentMethod === 'QRIS/TF' ? receiptDataUrl : null,
        receiptCacheUrl: paymentMethod === 'QRIS/TF' ? receiptCacheUrl : null,
        fileName: paymentMethod === 'QRIS/TF' ? fileName : '',
      }
      const queue = JSON.parse(localStorage.getItem(queueKey) || '[]')
      queue.push(offlineTx)
      localStorage.setItem(queueKey, JSON.stringify(queue))
      setOfflineQueue(queue)
      setMessage({ type: 'success', text: 'Offline tersimpan.' })
      resetForm()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {requireCustomerName && (
        <div className="input-group">
          <label>Nama Pembeli (Wajib)</label>
          <input type="text" className="input-field" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Nama pembeli" required />
        </div>
      )}
      <div className="input-group">
        <label>Daftar Produk &amp; Sub‑Produk</label>
        {items.map((item, index) => (
          <div key={index} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select className="input-field" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', +e.target.value)} style={{ width: '70px' }} required>
                {[...Array(10).keys()].map((i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </select>
              <span>x</span>
              <select className="input-field" value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} style={{ flex: 1 }} required>
                <option value="" disabled>Pilih Produk</option>
                {products.map((p) => <option key={p.id} value={p.name}>{p.name} (Rp {p.price.toLocaleString('id-ID')})</option>)}
              </select>
              {items.length > 1 && <button type="button" onClick={() => removeItem(index)}>✕</button>}
            </div>
            {requireSubProduct && (
              <div style={{ marginTop: '0.5rem', paddingLeft: '1rem', borderLeft: '2px dashed #ccc' }}>
                {(item.subs || []).map((sub, si) => (
                  <div key={si} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <select className="input-field" value={sub.qty} onChange={(e) => handleSubChange(index, si, 'qty', +e.target.value)} style={{ width: '60px' }}>
                      {[...Array(10).keys()].map((i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                    </select>
                    <span>x</span>
                    <select className="input-field" value={sub.name} onChange={(e) => handleSubChange(index, si, 'name', e.target.value)} style={{ flex: 1 }}>
                      <option value="" disabled>Sub‑produk</option>
                      {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                    <button type="button" onClick={() => removeSub(index, si)}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => addSub(index)}>+ Sub‑produk</button>
              </div>
            )}
          </div>
        ))}
        <button type="button" onClick={addItem}>+ Produk Lain</button>
      </div>
      <div className="input-group">
        <label>Total (Rp)</label>
        <input type="number" className="input-field" value={amount} readOnly={!!products.length} required />
      </div>
      <div className="input-group">
        <label>Metode</label>
        <select className="input-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option>CASH</option>
          <option>QRIS/TF</option>
        </select>
      </div>
      {paymentMethod === 'CASH' && (
        <div className="input-group">
          <label>Uang Diterima</label>
          <input type="number" className="input-field" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} />
        </div>
      )}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Mengirim...' : 'Kirim'}
      </button>
    </form>
  )
}
