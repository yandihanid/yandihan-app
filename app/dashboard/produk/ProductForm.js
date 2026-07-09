'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addProduct } from './actions'

export default function ProductForm({ storeId }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')

  // variant state
  const [hasVariants, setHasVariants] = useState(false)
  const [variantGroups, setVariantGroups] = useState([])

  // discount & additional settings
  const [discountType, setDiscountType] = useState('none') // none, percent, amount
  const [discountPercent, setDiscountPercent] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [selfOrderEnabled, setSelfOrderEnabled] = useState(false)
  const [loyaltyPoints, setLoyaltyPoints] = useState('')

  function addVariantGroup() {
    setVariantGroups([
      ...variantGroups,
      { groupName: '', options: [{ name: '', price: '' }] },
    ])
  }

  function removeVariantGroup(index) {
    setVariantGroups(variantGroups.filter((_, i) => i !== index))
  }

  function changeGroupName(index, value) {
    const updated = [...variantGroups]
    updated[index] = { ...updated[index], groupName: value }
    setVariantGroups(updated)
  }

  function addOption(groupIndex) {
    const updated = [...variantGroups]
    updated[groupIndex] = {
      ...updated[groupIndex],
      options: [
        ...updated[groupIndex].options,
        { name: '', price: '' },
      ],
    }
    setVariantGroups(updated)
  }

  function removeOption(groupIndex, optionIndex) {
    const updated = [...variantGroups]
    updated[groupIndex] = {
      ...updated[groupIndex],
      options: updated[groupIndex].options.filter((_, i) => i !== optionIndex),
    }
    setVariantGroups(updated)
  }

  function changeOption(groupIndex, optionIndex, field, value) {
    const updated = [...variantGroups]
    const options = [...updated[groupIndex].options]
    options[optionIndex] = { ...options[optionIndex], [field]: value }
    updated[groupIndex] = { ...updated[groupIndex], options }
    setVariantGroups(updated)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData()
    formData.append('storeId', storeId)
    formData.append('name', name)
    formData.append('price', price)
    formData.append('stock', stock)

    // diskon
    if (discountType === 'percent' && discountPercent) {
      formData.append('discountPercent', discountPercent)
    } else if (discountType === 'amount' && discountAmount) {
      formData.append('discountAmount', discountAmount)
    }

    if (selfOrderEnabled) {
      formData.append('selfOrder', 'on')
    }

    if (loyaltyPoints) {
      formData.append('loyaltyPoints', loyaltyPoints)
    }

    // sertakan data varian sebagai JSON string
    if (hasVariants && variantGroups.length > 0) {
      formData.append('variants', JSON.stringify(variantGroups))
    }

    const result = await addProduct(formData)

    setLoading(false)
    if (!result.error) {
      setName('')
      setPrice('')
      setStock('')
      setHasVariants(false)
      setVariantGroups([])
      setDiscountPercent('')
      setDiscountAmount('')
      setDiscountType('none')
      setSelfOrderEnabled(false)
      setLoyaltyPoints('')
      router.refresh()
      router.replace('/dashboard/produk')
    } else {
      alert(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', flexDirection: 'column' }}>
      <div style={{ width: '100%', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '2', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Nama Produk</label>
          <input
            type="text"
            className="input-field"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Misal: Nasi Goreng Spesial"
            required
          />
        </div>
        <div style={{ flex: '1', minWidth: '120px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Harga (Rp)</label>
          <input
            type="number"
            className="input-field"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="Misal: 25000"
            required
            min="0"
          />
        </div>
        <div style={{ flex: '1', minWidth: '100px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Stok Awal</label>
          <input
            type="number"
            className="input-field"
            value={stock}
            onChange={e => setStock(e.target.value)}
            placeholder="Misal: 50"
            required
            min="0"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '52px', padding: '0 1.5rem' }}>
          {loading ? <div className="spinner-sm"></div> : '+ Tambah'}
        </button>
      </div>

      {/* Diskon & Pengaturan Tambahan */}
      <div style={{ width: '100%', marginTop: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' }}>
        <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '600' }}>Diskon & Pengaturan Tambahan</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Diskon</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                <input type="radio" name="discountType" value="none" checked={discountType === 'none'} onChange={() => setDiscountType('none')} /> Tanpa
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                <input type="radio" name="discountType" value="percent" checked={discountType === 'percent'} onChange={() => setDiscountType('percent')} /> Persen (%)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                <input type="radio" name="discountType" value="amount" checked={discountType === 'amount'} onChange={() => setDiscountType('amount')} /> Nominal (Rp)
              </label>
            </div>
          </div>
          {discountType === 'percent' && (
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Persen Diskon</label>
              <input
                type="number"
                className="input-field"
                value={discountPercent}
                onChange={e => setDiscountPercent(e.target.value)}
                placeholder="Misal: 10"
                min="0"
                max="100"
              />
            </div>
          )}
          {discountType === 'amount' && (
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Diskon (Rp)</label>
              <input
                type="number"
                className="input-field"
                value={discountAmount}
                onChange={e => setDiscountAmount(e.target.value)}
                placeholder="Misal: 5000"
                min="0"
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
              <input
                type="checkbox"
                checked={selfOrderEnabled}
                onChange={(e) => setSelfOrderEnabled(e.target.checked)}
              />
              Tersedia untuk Self-Order
            </label>
          </div>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Poin Loyalitas per Item</label>
            <input
              type="number"
              className="input-field"
              value={loyaltyPoints}
              onChange={e => setLoyaltyPoints(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Toggle varian */}
      <div style={{ width: '100%', marginTop: '0.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={e => setHasVariants(e.target.checked)}
          />
          Produk ini memiliki varian / opsi (misal: tambah sayur, pilih daging, ukuran)
        </label>
      </div>

      {hasVariants && (
        <div style={{ width: '100%', border: '1px dashed #ccc', borderRadius: '8px', padding: '1rem', marginTop: '0.5rem' }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Kelola Varian</h4>
          {variantGroups.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: '1rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Nama grup varian (misal: Topping)"
                  value={group.groupName}
                  onChange={e => changeGroupName(gIdx, e.target.value)}
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.875rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button type="button" onClick={() => removeVariantGroup(gIdx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                  Hapus Grup
                </button>
              </div>
              {group.options.map((opt, oIdx) => (
                <div key={oIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Nama opsi (misal: Telur, Ayam)"
                    value={opt.name}
                    onChange={e => changeOption(gIdx, oIdx, 'name', e.target.value)}
                    style={{ flex: 1, padding: '0.4rem', fontSize: '0.875rem', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <input
                    type="number"
                    placeholder="Tambah harga (Rp)"
                    value={opt.price}
                    onChange={e => changeOption(gIdx, oIdx, 'price', e.target.value)}
                    min="0"
                    style={{ width: '120px', padding: '0.4rem', fontSize: '0.875rem', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <button type="button" onClick={() => removeOption(gIdx, oIdx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    Hapus
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => addOption(gIdx)} style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', fontSize: '0.875rem' }}>
                + Tambah Opsi
              </button>
            </div>
          ))}
          <button type="button" onClick={addVariantGroup} style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            + Tambah Grup Varian
          </button>
        </div>
      )}
    </form>
  )
}
