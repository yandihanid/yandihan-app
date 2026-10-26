'use client'

import { useCallback, useEffect, useState } from 'react'

const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

export default function OnTheTableManager({ storeId, storeName }) {
  const [tables, setTables] = useState([])
  const [tableNumber, setTableNumber] = useState('')
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/on-the-table/tables?storeId=${storeId}`)
    const data = await res.json()
    if (Array.isArray(data)) setTables(data)
  }, [storeId])

  useEffect(() => { load() }, [load])

  const addTable = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/on-the-table/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, tableNumber, label, note }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal menambah meja'); return }
      setTableNumber('')
      setLabel('')
      setNote('')
      await load()
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const removeTable = async (id) => {
    await fetch('/api/on-the-table/tables', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, id }),
    })
    await load()
  }

  const qrUrl = (tableNum) => {
    const data = encodeURIComponent(`${baseUrl}/t/${storeId}/${tableNum}`)
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}`
  }

  const printAll = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const html = `
      <html><head><title>Cetak QR Meja - ${storeName}</title>
      <style>
        body { font-family: sans-serif; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .card { border: 1px solid #ccc; padding: 16px; text-align: center; page-break-inside: avoid; }
        .title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        .note { font-size: 12px; color: #555; margin-top: 8px; }
      </style></head><body>
      <h1>QR Meja - ${storeName}</h1>
      <div class="grid">
        ${tables.map((t) => `
          <div class="card">
            <div class="title">Meja ${t.table_number}${t.label ? ' - ' + t.label : ''}</div>
            <img src="${qrUrl(t.table_number)}" alt="QR Meja ${t.table_number}" />
            <div class="note">${t.note || ''}</div>
            <div class="note">${baseUrl}/t/${storeId}/${t.table_number}</div>
          </div>
        `).join('')}
      </div>
      <script>window.onload = () => window.print()</script>
      </body></html>
    `
    w.document.write(html)
    w.document.close()
  }

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <h2>On the Table - QR Meja</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        Daftarkan nomor meja, generate QR, dan cetak untuk ditempel di meja. Pelanggan scan QR untuk memesan dan membayar.
      </p>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3>Tambah Meja</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input placeholder="Nomor meja" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
          <input placeholder="Label (opsional)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button onClick={addTable} disabled={loading}>{loading ? '...' : 'Tambah'}</button>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </section>

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Daftar Meja</h3>
          <button onClick={printAll} disabled={tables.length === 0}>Cetak QR</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {tables.map((t) => (
            <div key={t.id} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <strong>Meja {t.table_number}</strong>
              {t.label && <div style={{ fontSize: '0.85rem' }}>{t.label}</div>}
              <img src={qrUrl(t.table_number)} alt={`QR Meja ${t.table_number}`} style={{ margin: '0.75rem auto', display: 'block' }} />
              {t.note && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.note}</div>}
              <button onClick={() => removeTable(t.id)} style={{ marginTop: '0.5rem' }}>Hapus</button>
            </div>
          ))}
        </div>
        {tables.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Belum ada meja.</p>}
      </section>
    </div>
  )
}
