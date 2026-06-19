'use client'

import { useState } from 'react'
import { submitTransaction } from './actions'

export default function CashierForm({ cashierId, storeId, token }) {
  const [amount, setAmount] = useState('')
  const [productName, setProductName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('cashierId', cashierId)
    formData.append('storeId', storeId)
    formData.append('token', token)
    formData.append('amount', amount)
    formData.append('productName', productName)
    formData.append('paymentMethod', paymentMethod)
    if (file && paymentMethod === 'QRIS/TF') {
      formData.append('receipt', file)
    }

    const result = await submitTransaction(formData)
    
    setLoading(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Transaksi berhasil dicatat!' })
      setAmount('')
      setProductName('')
      setFile(null)
      e.target.reset()
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
        <label>Nominal (Rp)</label>
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
        <label>Nama Produk / Deskripsi</label>
        <input 
          type="text" 
          className="input-field" 
          value={productName} 
          onChange={e => setProductName(e.target.value)} 
          required 
          placeholder="Misal: Nasi Goreng Spesial"
        />
      </div>

      <div className="input-group">
        <label>Metode Pembayaran</label>
        <select 
          className="input-field" 
          value={paymentMethod} 
          onChange={e => {
            setPaymentMethod(e.target.value)
            if (e.target.value === 'CASH') setFile(null)
          }}
        >
          <option value="CASH">CASH (Tunai)</option>
          <option value="QRIS/TF">QRIS / Transfer Bank</option>
        </select>
      </div>

      {paymentMethod === 'QRIS/TF' && (
        <div className="input-group animate-fade-in">
          <label>Upload Bukti Pembayaran (Wajib)</label>
          <input 
            type="file" 
            className="input-field" 
            accept="image/*"
            onChange={e => setFile(e.target.files[0])} 
            required
            style={{ padding: '0.5rem' }}
          />
        </div>
      )}

      <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
        {loading ? 'Mengirim...' : 'Kirim Laporan'}
      </button>
    </form>
  )
}
