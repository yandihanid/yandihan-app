'use client'

import { useCallback, useEffect, useState } from 'react'

function getBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ''
}

function qrUrl(storeId, tableNumber, size = 220) {
  const data = encodeURIComponent(`${getBaseUrl()}/t/${storeId}/${tableNumber}`)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}`
}

export default function OnTheTableManager({ storeId, storeName }) {
  const [tables, setTables] = useState([])
  const [tableNumber, setTableNumber] = useState('')
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [previewTable, setPreviewTable] = useState(null)
  const [printPreview, setPrintPreview] = useState(false)

  const fetchTables = useCallback(async () => {
    const res = await fetch(`/api/on-the-table/tables?storeId=${storeId}`)
    return res.json()
  }, [storeId])

  const load = useCallback(async () => {
    try {
      const data = await fetchTables()
      if (Array.isArray(data)) {
        setTables(data)
        setError(null)
      } else {
        setTables([])
        setError(data?.error || 'Gagal memuat daftar meja. Pastikan migrasi database sudah dijalankan.')
      }
    } catch {
      setError('Gagal memuat daftar meja.')
    }
  }, [fetchTables])

  useEffect(() => {
    let cancelled = false
    fetchTables()
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data)) {
          setTables(data)
          setError(null)
        } else {
          setTables([])
          setError(data?.error || 'Gagal memuat daftar meja. Pastikan migrasi database sudah dijalankan.')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Gagal memuat daftar meja.')
      })
    return () => { cancelled = true }
  }, [fetchTables])

  const addTable = async (e) => {
    e?.preventDefault?.()
    setLoading(true)
    setError(null)
    setNotice(null)
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
      setNotice(`Meja ${data.table_number} berhasil ditambahkan.`)
      await load()
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const removeTable = async (id) => {
    if (!window.confirm('Hapus meja ini? QR yang sudah dicetak tidak akan berlaku lagi.')) return
    await fetch('/api/on-the-table/tables', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, id }),
    })
    setPreviewTable(null)
    await load()
  }

  const printTable = (table) => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!doctype html><html><head><title>Meja ${table.table_number} - ${storeName}</title>
      <style>
        @page { size: A5; margin: 12mm; }
        body { font-family: system-ui, sans-serif; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 90vh; }
        .card { border: 2px solid #0f172a; border-radius: 18px; padding: 28px 24px; text-align: center; width: 100%; max-width: 360px; }
        .store { font-size: 14px; letter-spacing: .08em; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
        .title { font-size: 34px; font-weight: 800; margin: 0 0 4px; }
        .label { font-size: 16px; color: #334155; margin-bottom: 16px; }
        img { width: 220px; height: 220px; }
        .note { font-size: 12px; color: #64748b; margin-top: 16px; line-height: 1.5; }
        .hint { font-size: 12px; font-weight: 600; margin-top: 12px; }
      </style></head><body>
      <div class="card">
        <div class="store">${storeName}</div>
        <h1 class="title">Meja ${table.table_number}</h1>
        ${table.label ? `<div class="label">${table.label}</div>` : ''}
        <img src="${qrUrl(storeId, table.table_number, 300)}" alt="QR Meja ${table.table_number}" />
        <div class="hint">Scan untuk pesan & bayar</div>
        ${table.note ? `<div class="note">${table.note}</div>` : ''}
      </div>
      <script>window.onload = () => window.print()</script>
      </body></html>`)
    w.document.close()
  }

  const printAll = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!doctype html><html><head><title>Cetak QR Meja - ${storeName}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: system-ui, sans-serif; margin: 0; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { color: #64748b; font-size: 12px; margin: 0 0 16px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .card { border: 1.5px solid #0f172a; border-radius: 14px; padding: 16px; text-align: center; page-break-inside: avoid; }
        .store { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
        .title { font-size: 24px; font-weight: 800; margin: 0 0 2px; }
        .label { font-size: 13px; color: #334155; margin-bottom: 10px; }
        img { width: 170px; height: 170px; }
        .note { font-size: 11px; color: #64748b; margin-top: 8px; line-height: 1.4; }
        .hint { font-size: 11px; font-weight: 700; margin-top: 6px; }
      </style></head><body>
      <h1>QR Meja - ${storeName}</h1>
      <p class="sub">${tables.length} meja. Gunting dan tempel di masing-masing meja.</p>
      <div class="grid">
        ${tables.map((t) => `
          <div class="card">
            <div class="store">${storeName}</div>
            <div class="title">Meja ${t.table_number}</div>
            ${t.label ? `<div class="label">${t.label}</div>` : ''}
            <img src="${qrUrl(storeId, t.table_number, 220)}" alt="QR Meja ${t.table_number}" />
            <div class="hint">Scan untuk pesan & bayar</div>
            ${t.note ? `<div class="note">${t.note}</div>` : ''}
          </div>
        `).join('')}
      </div>
      <script>window.onload = () => window.print()</script>
      </body></html>`)
    w.document.close()
  }

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>On the Table</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Daftarkan meja, generate QR, lalu cetak untuk ditempel. Pelanggan scan QR untuk memesan dan membayar.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setPrintPreview(true)} disabled={tables.length === 0} className="btn btn-secondary">
            Print Preview
          </button>
          <button onClick={printAll} disabled={tables.length === 0} className="btn btn-primary">
            Cetak Semua QR
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total meja</p>
          <strong style={{ fontSize: '1.75rem' }}>{tables.length}</strong>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Status add-on</p>
          <strong style={{ fontSize: '1rem', color: 'var(--success-color)' }}>Aktif</strong>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Link pesanan</p>
          <strong style={{ fontSize: '0.85rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>/{`t/${storeId}/<nomor>`}</strong>
        </div>
      </div>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>Tambah Meja</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Nomor meja wajib unik. Label dan catatan membantu karyawan mengenali meja.
          </p>
        </div>
        <form onSubmit={addTable} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
            Nomor meja
            <input type="number" min="1" required placeholder="contoh: 1" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
            Label (opsional)
            <input placeholder="contoh: VIP / Teras" value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
            Catatan (opsional)
            <input placeholder="contoh: dekat jendela" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Tambah Meja'}
          </button>
        </form>
        {error && <p style={{ color: 'var(--danger-color, #dc2626)', margin: 0 }}>{error}</p>}
        {notice && <p style={{ color: 'var(--success-color)', margin: 0 }}>{notice}</p>}
      </section>

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>Daftar Meja</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Klik kartu untuk melihat QR lebih besar.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {tables.map((t) => (
            <article key={t.id} className="card" style={{ padding: '1rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setPreviewTable(t)}
                style={{ background: 'none', border: 0, padding: 0, width: '100%', cursor: 'zoom-in' }}
                aria-label={`Lihat QR Meja ${t.table_number}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '1.05rem' }}>Meja {t.table_number}</strong>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99, background: 'var(--secondary-color)', color: 'var(--primary-color)' }}>
                    QR aktif
                  </span>
                </div>
                {t.label && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t.label}</div>}
                <img
                  src={qrUrl(storeId, t.table_number)}
                  alt={`QR Meja ${t.table_number}`}
                  style={{ margin: '0 auto', display: 'block', width: 150, height: 150, background: '#fff', borderRadius: 8 }}
                />
              </button>
              {t.note && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{t.note}</div>}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPreviewTable(t)}>
                  Lihat
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => printTable(t)}>
                  Cetak
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => removeTable(t.id)} aria-label={`Hapus Meja ${t.table_number}`}>
                  Hapus
                </button>
              </div>
            </article>
          ))}
        </div>
        {tables.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
            <p style={{ margin: 0 }}>Belum ada meja. Tambahkan meja pertama di atas.</p>
          </div>
        )}
      </section>

      {previewTable && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`QR Meja ${previewTable.table_number}`}
          onClick={() => setPreviewTable(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}
        >
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Meja {previewTable.table_number}{previewTable.label ? ` - ${previewTable.label}` : ''}</h3>
            <img src={qrUrl(storeId, previewTable.table_number, 300)} alt={`QR Meja ${previewTable.table_number}`} style={{ width: '100%', maxWidth: 280, margin: '0 auto', display: 'block', background: '#fff', borderRadius: 12 }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 0 }}>
              Scan untuk pesan & bayar
            </p>
            {previewTable.note && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{previewTable.note}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => printTable(previewTable)}>
                Cetak QR
              </button>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPreviewTable(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {printPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Print preview QR meja"
          onClick={() => setPrintPreview(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}
        >
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0 }}>Print Preview</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {tables.length} QR meja siap dicetak. Layout 2 kolom per halaman.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-primary" onClick={printAll}>Cetak</button>
                <button type="button" className="btn btn-secondary" onClick={() => setPrintPreview(false)}>Tutup</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', marginTop: '1rem', background: '#fff', borderRadius: 8, padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {tables.map((t) => (
                  <div key={t.id} style={{ border: '1px solid #0f172a', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>{storeName}</div>
                    <strong style={{ display: 'block', fontSize: '1.1rem' }}>Meja {t.table_number}</strong>
                    {t.label && <div style={{ fontSize: '0.75rem', color: '#334155' }}>{t.label}</div>}
                    <img src={qrUrl(storeId, t.table_number, 180)} alt={`QR Meja ${t.table_number}`} style={{ width: 120, height: 120, margin: '0.5rem auto', display: 'block' }} />
                    <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>Scan untuk pesan & bayar</div>
                    {t.note && <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{t.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
