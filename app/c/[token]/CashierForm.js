'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { submitTransaction } from './actions'
import { compressImage, dataUrlToFile, readFileAsDataUrl } from './imageUtils'
import {
  dropReceiptBlob,
  enqueue,
  readQueue,
  replaceQueue,
  serverQueue,
  storeReceiptBlob,
  subscribeQueue,
  takeReceiptBlob,
} from './offlineQueue'
import { formatDateTimeWib, formatRupiah, normalizePhone } from '@/lib/format'
import { discountAmount } from '@/lib/loyalty'

// Layar yang paling sering dipakai di produk ini, dan sebelumnya yang paling
// banyak rusaknya. Yang berubah di pass ini:
//
//   B1  Ada <input type="file"> sungguhan. Sebelumnya fileRef dan
//       handleFileChange ada di file ini tapi tidak terpasang ke elemen apa
//       pun, jadi penjualan QRIS/TF SELALU gagal (receipt_required default
//       true) tanpa pesan apa pun.
//   B2  Pesan (`message`) dirender. Sebelumnya di-set 8 kali dan tidak pernah
//       tampil: "Uang tidak cukup", "Stok tidak cukup", "Bukti wajib" -- semua
//       tidak terlihat, kasir hanya melihat tombol kembali dari "Mengirim...".
//   B3  Kembalian ditampilkan.
//   B4  Yang ditampilkan = yang ditagih. Dulu input Total menampilkan subtotal
//       sementara yang dikirim ke server nilai setelah diskon.
//   B5  Diskon 100% menghasilkan Rp 0, bukan harga penuh (dulu
//       `finalAmount || amount` -- 0 itu falsy).
//   B6  Diskon loyalitas digerbangi server, bukan prop yang berlaku ke semua
//       orang. Angka di layar hanya pratinjau dari /api/cashier/loyalty.
//   D6  Grid produk yang bisa ditap, stepper qty (bukan <select> 1-10), tombol
//       nominal cepat, target sentuh 44px, status offline, dan empty state.
//
// Payload ke server sekarang terstruktur: items = [{ product_id, qty, subs }].
// Server membaca harga dari products.price berdasarkan id (temuan C1) dan tidak
// pernah lagi mem-parse string tampilan untuk tahu apa yang terjual (C2).

const QUICK_CASH = [2000, 5000, 10000, 20000, 50000, 100000]
const RETRY_MS = 12000

let lineSeq = 0
const nextKey = () => {
  lineSeq += 1
  return `l${lineSeq}`
}

function subscribeOnline(callback) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

const getOnline = () => navigator.onLine
const getOnlineServer = () => true

function digitsToInt(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return null
  return Number.parseInt(digits, 10)
}

export default function CashierForm({
  token,
  products = [],
  receiptRequired = true,
  requireSubProduct = false,
  requireCustomerName = false,
  loyaltyEnabled = false,
  visitThreshold = 5,
}) {
  const router = useRouter()
  const fileRef = useRef(null)
  const lastAttemptRef = useRef(0)
  const syncingRef = useRef(false)

  const [lines, setLines] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [cashReceived, setCashReceived] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [loyalty, setLoyalty] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const isOnline = useSyncExternalStore(subscribeOnline, getOnline, getOnlineServer)
  const queue = useSyncExternalStore(
    subscribeQueue,
    useCallback(() => readQueue(token), [token]),
    serverQueue
  )

  const byId = useMemo(() => {
    const map = new Map()
    for (const product of products) map.set(product.id, product)
    return map
  }, [products])

  const priceOf = useCallback((id) => Number(byId.get(id)?.price) || 0, [byId])

  const subtotal = useMemo(() => {
    let sum = 0
    for (const line of lines) {
      sum += priceOf(line.productId) * line.qty
      for (const sub of line.subs) sum += priceOf(sub.productId) * sub.qty
    }
    return Math.round(sum)
  }, [lines, priceOf])

  const phoneNormalized = normalizePhone(customerPhone)

  // Hasil lookup loyalitas disimpan bersama nomornya, jadi kalau nomor di form
  // berubah hasil lama otomatis tidak terpakai. Tanpa ini perlu setLoyalty(null)
  // di dalam effect, yang memicu render berantai (dilarang react-hooks).
  const loyaltyFor = loyalty?.phone === phoneNormalized ? loyalty : null

  // Angka ini hanya PRATINJAU. Server menghitung ulang diskonnya sendiri di
  // submitTransaction, jadi memalsukan respons /api/cashier/loyalty tidak
  // menghasilkan potongan apa pun.
  const discountPercent = loyaltyFor?.eligible ? loyaltyFor.discountPercent : 0
  const discount = discountAmount(subtotal, discountPercent)
  const total = Math.max(0, subtotal - discount)
  const received = paymentMethod === 'CASH' ? digitsToInt(cashReceived) : null
  const change = received != null && received >= total ? received - total : null
  const qtyInCart = useMemo(() => {
    const counts = new Map()
    for (const line of lines) {
      counts.set(line.productId, (counts.get(line.productId) || 0) + line.qty)
      for (const sub of line.subs) counts.set(sub.productId, (counts.get(sub.productId) || 0) + sub.qty)
    }
    return counts
  }, [lines])

  // Pratinjau diskon dibaca dari endpoint yang HANYA membaca.
  // POST /api/pelanggan tidak dipakai di sini karena endpoint itu menaikkan
  // visit_count setiap kali dipanggil -- artinya cukup mengetik ulang nomor
  // berkali-kali untuk mencapai ambang diskon.
  useEffect(() => {
    if (!loyaltyEnabled || !phoneNormalized || !isOnline) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/cashier/loyalty?phone=${encodeURIComponent(phoneNormalized)}`, {
        headers: { 'x-cashier-token': token },
        cache: 'no-store',
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.enabled) setLoyalty({ ...data, phone: phoneNormalized })
        })
        .catch(() => {
          // Gagal mengambil pratinjau tidak boleh menghalangi transaksi.
        })
    }, 400)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [loyaltyEnabled, phoneNormalized, isOnline, token])

  function addProduct(product) {
    setMessage(null)
    setLines((current) => {
      const index = current.findIndex((line) => line.productId === product.id && line.subs.length === 0)
      if (index >= 0) {
        const next = [...current]
        next[index] = { ...next[index], qty: next[index].qty + 1 }
        return next
      }
      return [...current, { key: nextKey(), productId: product.id, qty: 1, subs: [] }]
    })
  }

  function changeQty(key, delta, absolute) {
    setLines((current) =>
      current
        .map((line) => {
          if (line.key !== key) return line
          const qty = absolute != null ? absolute : line.qty + delta
          return { ...line, qty: Math.min(999, qty) }
        })
        .filter((line) => line.qty > 0)
    )
  }

  function removeLine(key) {
    setLines((current) => current.filter((line) => line.key !== key))
  }

  function addSub(lineKey, productId) {
    if (!productId) return
    setLines((current) =>
      current.map((line) => {
        if (line.key !== lineKey) return line
        const index = line.subs.findIndex((sub) => sub.productId === productId)
        if (index >= 0) {
          const subs = [...line.subs]
          subs[index] = { ...subs[index], qty: Math.min(999, subs[index].qty + 1) }
          return { ...line, subs }
        }
        return { ...line, subs: [...line.subs, { key: nextKey(), productId, qty: 1 }] }
      })
    )
  }

  function changeSubQty(lineKey, subKey, delta) {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== lineKey) return line
        const subs = line.subs
          .map((sub) => (sub.key === subKey ? { ...sub, qty: Math.min(999, sub.qty + delta) } : sub))
          .filter((sub) => sub.qty > 0)
        return { ...line, subs }
      })
    )
  }

  function removeSub(lineKey, subKey) {
    setLines((current) =>
      current.map((line) =>
        line.key === lineKey ? { ...line, subs: line.subs.filter((sub) => sub.key !== subKey) } : line
      )
    )
  }

  async function handleFileChange(event) {
    const raw = event.target.files?.[0]
    if (!raw) return
    if (!raw.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Bukti pembayaran harus berupa gambar.' })
      event.target.value = ''
      return
    }
    setMessage(null)
    const file = await compressImage(raw)
    setReceipt({ file, name: raw.name || 'bukti.jpg', url: URL.createObjectURL(file) })
  }

  function clearReceipt() {
    if (receipt?.url) URL.revokeObjectURL(receipt.url)
    setReceipt(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function resetForm() {
    setLines([])
    setCashReceived('')
    setBuyerName('')
    setCustomerPhone('')
    setLoyalty(null)
    clearReceipt()
  }

  function itemsPayload(list) {
    return JSON.stringify(
      list.map((line) => ({
        product_id: line.productId,
        qty: line.qty,
        subs: line.subs.map((sub) => ({ product_id: sub.productId, qty: sub.qty })),
      }))
    )
  }

  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return
    const pending = readQueue(token)
    if (pending.length === 0) return

    syncingRef.current = true
    lastAttemptRef.current = Date.now()
    setSyncing(true)

    const remaining = []
    let sent = 0
    let rejected = 0

    try {
      for (let i = 0; i < pending.length; i++) {
        const entry = pending[i]
        let result
        try {
          result = await submitTransaction(await entryToFormData(entry))
        } catch {
          // Jaringan mati lagi di tengah sinkronisasi: sisanya tetap di antrean.
          remaining.push(...pending.slice(i))
          break
        }
        if (result?.error) rejected += 1
        else sent += 1
        await dropReceiptBlob(entry.receiptKey)
      }
    } finally {
      // finally, supaya satu throw tidak meninggalkan syncing=true permanen dan
      // antrean tidak pernah ditulis balik (bug versi sebelumnya).
      replaceQueue(token, remaining)
      syncingRef.current = false
      setSyncing(false)
    }

    if (sent > 0 || rejected > 0) {
      const parts = []
      if (sent > 0) parts.push(`${sent} transaksi offline berhasil dikirim`)
      if (rejected > 0) parts.push(`${rejected} ditolak server dan dikeluarkan dari antrean`)
      setMessage({ type: rejected > 0 ? 'warning' : 'success', text: `${parts.join(', ')}.` })
      router.refresh()
    }
  }, [token, router])

  useEffect(() => {
    if (!isOnline || queue.length === 0) return
    const wait = Math.max(0, RETRY_MS - (Date.now() - lastAttemptRef.current))
    const timer = setTimeout(() => {
      syncQueue()
    }, wait)
    return () => clearTimeout(timer)
  }, [isOnline, queue, syncQueue])

  async function queueOffline(payload, note) {
    const receiptKey = receipt?.file ? await storeReceiptBlob(payload.clientTxId, receipt.file) : null
    let receiptDataUrl = null
    if (receipt?.file && !receiptKey) {
      try {
        receiptDataUrl = await readFileAsDataUrl(receipt.file)
      } catch {
        receiptDataUrl = null
      }
    }
    const result = enqueue(token, {
      ...payload,
      receiptKey,
      receiptDataUrl,
      receiptName: receipt?.name || null,
      createdAt: Date.now(),
    })
    if (!result.ok) {
      setMessage({
        type: 'error',
        text: `Antrean offline penuh (${result.limit} transaksi). Sambungkan internet dulu supaya antrean terkirim.`,
      })
      return false
    }
    setMessage({ type: 'warning', text: note })
    resetForm()
    return true
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return

    if (lines.length === 0) {
      setMessage({ type: 'error', text: 'Belum ada item yang dipilih.' })
      return
    }
    if (requireSubProduct && lines.some((line) => line.subs.length === 0)) {
      setMessage({ type: 'error', text: 'Setiap item wajib punya minimal satu sub-produk.' })
      return
    }
    if (requireCustomerName && !buyerName.trim()) {
      setMessage({ type: 'error', text: 'Nama pembeli wajib diisi.' })
      return
    }
    if (paymentMethod === 'QRIS/TF' && receiptRequired && !receipt?.file) {
      setMessage({ type: 'error', text: 'Bukti pembayaran wajib difoto untuk QRIS/Transfer.' })
      return
    }
    if (paymentMethod === 'CASH' && (received == null ? total > 0 : received < total)) {
      setMessage({ type: 'error', text: `Uang tidak cukup. Total ${formatRupiah(total)}.` })
      return
    }

    const payload = {
      clientTxId: crypto.randomUUID(),
      token,
      items: itemsPayload(lines),
      paymentMethod,
      cashReceived: paymentMethod === 'CASH' ? String(received ?? 0) : '',
      buyerName: buyerName.trim(),
      customerPhone: phoneNormalized || '',
    }

    setLoading(true)
    setMessage(null)
    try {
      if (!isOnline) {
        await queueOffline(payload, 'Sedang offline. Transaksi disimpan dan akan terkirim otomatis.')
        return
      }

      let result
      try {
        result = await submitTransaction(await entryToFormData({ ...payload, receiptFile: receipt?.file || null }))
      } catch {
        await queueOffline(payload, 'Koneksi terputus. Transaksi disimpan di antrean offline.')
        return
      }

      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
        return
      }

      resetForm()
      router.push(`/r/${result.transactionId}`)
    } finally {
      setLoading(false)
    }
  }

  const summary = (
    <div className="pos-summary">
      <div className="pos-summary-row">
        <span>Subtotal</span>
        <span>{formatRupiah(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="pos-summary-row pos-summary-discount">
          <span>Diskon pelanggan setia ({discountPercent}%)</span>
          <span>-{formatRupiah(discount)}</span>
        </div>
      )}
      <div className="pos-summary-row pos-summary-total">
        <span>Total Bayar</span>
        <span>{formatRupiah(total)}</span>
      </div>
      {paymentMethod === 'CASH' && (
        <>
          <div className="pos-summary-row">
            <span>Uang Diterima</span>
            <span>{received != null ? formatRupiah(received) : '-'}</span>
          </div>
          <div className="pos-summary-row pos-summary-change">
            <span>Kembalian</span>
            <span>{change != null ? formatRupiah(change) : '-'}</span>
          </div>
        </>
      )}
    </div>
  )

  if (products.length === 0) {
    return (
      <div className="pos">
        <div className="pos-empty">
          <strong>Belum ada produk</strong>
          <p style={{ margin: 0 }}>
            Kasir tidak bisa mencatat penjualan sebelum ada produk beserta harganya. Harga selalu
            diambil dari data produk, tidak diketik manual di layar ini.
          </p>
          <p style={{ margin: 0, fontSize: '0.8125rem' }}>
            Minta pemilik toko membuka <strong>Dashboard &rarr; Produk</strong> lalu menambahkan
            produk.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form className="pos" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 16 }}>
        <span className={`pos-status ${isOnline ? 'pos-status-online' : 'pos-status-offline'}`}>
          <span className="pos-dot" aria-hidden="true" />
          {isOnline ? 'Online' : 'Offline - transaksi disimpan di perangkat'}
        </span>
        {queue.length > 0 && (
          <>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {queue.length} menunggu terkirim
            </span>
            <button
              type="button"
              className="pos-text-btn"
              onClick={() => syncQueue()}
              disabled={!isOnline || syncing}
            >
              {syncing ? 'Mengirim...' : 'Kirim sekarang'}
            </button>
          </>
        )}
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} role="status" aria-live="polite">
          {message.text}
        </div>
      )}

      <fieldset style={{ border: 0, padding: 0, margin: '0 0 20px' }}>
        <legend className="label" style={{ padding: 0, marginBottom: 8 }}>
          Pilih Produk
        </legend>
        <div className="pos-grid">
          {products.map((product) => {
            const inCart = qtyInCart.get(product.id) || 0
            const soldOut = Number(product.stock) <= 0
            return (
              <button
                key={product.id}
                type="button"
                className="pos-product"
                onClick={() => addProduct(product)}
                disabled={soldOut}
                aria-pressed={inCart > 0}
                aria-label={`${product.name}, ${formatRupiah(product.price)}${soldOut ? ', stok habis' : ''}`}
              >
                <span>{product.name}</span>
                <span className="pos-product-price">{formatRupiah(product.price)}</span>
                <span className="pos-product-stock">
                  {soldOut ? 'Stok habis' : `Stok ${product.stock}`}
                </span>
                {inCart > 0 && <span className="pos-badge">{inCart}</span>}
              </button>
            )
          })}
        </div>
      </fieldset>

      {lines.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span className="label">Keranjang</span>
          {lines.map((line) => {
            const product = byId.get(line.productId)
            return (
              <div key={line.key} className="pos-line">
                <div className="pos-line-head">
                  <span className="pos-line-name">
                    {product?.name || 'Produk terhapus'}
                    <br />
                    <span className="pos-product-price">{formatRupiah(priceOf(line.productId))}</span>
                  </span>
                  <div className="qty-stepper">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => changeQty(line.key, -1)}
                      aria-label={`Kurangi ${product?.name || 'item'}`}
                    >
                      &minus;
                    </button>
                    <input
                      className="qty-input"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="999"
                      value={line.qty}
                      onChange={(e) => changeQty(line.key, 0, digitsToInt(e.target.value) ?? 1)}
                      aria-label={`Jumlah ${product?.name || 'item'}`}
                    />
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => changeQty(line.key, 1)}
                      aria-label={`Tambah ${product?.name || 'item'}`}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeLine(line.key)}
                    aria-label={`Hapus ${product?.name || 'item'} dari keranjang`}
                  >
                    &times;
                  </button>
                </div>

                {line.subs.map((sub) => (
                  <div key={sub.key} className="pos-line-sub">
                    <span className="pos-line-name">
                      {byId.get(sub.productId)?.name || 'Produk terhapus'}{' '}
                      <span className="pos-product-price">
                        {formatRupiah(priceOf(sub.productId))}
                      </span>
                    </span>
                    <div className="qty-stepper">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => changeSubQty(line.key, sub.key, -1)}
                        aria-label="Kurangi sub-produk"
                      >
                        &minus;
                      </button>
                      <span className="qty-input" style={{ lineHeight: '44px' }}>
                        {sub.qty}
                      </span>
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => changeSubQty(line.key, sub.key, 1)}
                        aria-label="Tambah sub-produk"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removeSub(line.key, sub.key)}
                      aria-label="Hapus sub-produk"
                    >
                      &times;
                    </button>
                  </div>
                ))}

                <label className="pos-line-sub" style={{ gap: 8 }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    + Sub-produk{requireSubProduct && line.subs.length === 0 ? ' (wajib)' : ''}
                  </span>
                  <select
                    className="input"
                    style={{ flex: 1, minHeight: 'var(--tap-target)' }}
                    value=""
                    onChange={(e) => {
                      addSub(line.key, e.target.value)
                      e.target.value = ''
                    }}
                  >
                    <option value="">Pilih tambahan...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {formatRupiah(product.price)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )
          })}
        </div>
      )}

      <div className="form-group">
        <label className="label" htmlFor="pos-buyer">
          Nama Pembeli {requireCustomerName ? '(wajib)' : '(opsional)'}
        </label>
        <input
          id="pos-buyer"
          className="input"
          type="text"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          maxLength={120}
          placeholder="Contoh: Bu Sri"
          required={requireCustomerName}
        />
      </div>

      {loyaltyEnabled && (
        <div className="form-group">
          <label className="label" htmlFor="pos-phone">
            No. HP Pelanggan (opsional, untuk diskon pelanggan setia)
          </label>
          <input
            id="pos-phone"
            className="input"
            type="tel"
            inputMode="numeric"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            maxLength={20}
            placeholder="08xxxxxxxxxx"
          />
          <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }} aria-live="polite">
            {!phoneNormalized && customerPhone
              ? 'Nomor belum lengkap.'
              : loyaltyFor?.eligible
                ? `${loyaltyFor.name || 'Pelanggan'} - kunjungan ke-${loyaltyFor.visitCount + 1}, dapat diskon ${loyaltyFor.discountPercent}%.`
                : loyaltyFor?.known
                  ? `${loyaltyFor.name || 'Pelanggan'} - kunjungan ke-${loyaltyFor.visitCount + 1}, ${loyaltyFor.visitsToGo} lagi untuk dapat diskon.`
                  : phoneNormalized
                    ? `Pelanggan baru. Diskon setelah ${visitThreshold} kunjungan.`
                    : 'Diisi kalau pembeli ingin kunjungannya dihitung.'}
          </p>
        </div>
      )}

      <div className="form-group">
        <span className="label">Metode Pembayaran</span>
        <div className="flex gap-2">
          {['CASH', 'QRIS/TF'].map((method) => (
            <button
              key={method}
              type="button"
              className="pos-product"
              style={{ minHeight: 'var(--tap-target)', flex: 1 }}
              aria-pressed={paymentMethod === method}
              onClick={() => {
                setPaymentMethod(method)
                setMessage(null)
              }}
            >
              {method === 'CASH' ? 'Tunai' : 'QRIS / Transfer'}
            </button>
          ))}
        </div>
      </div>

      {paymentMethod === 'QRIS/TF' && (
        <div className="form-group">
          <span className="label">
            Bukti Pembayaran {receiptRequired ? '(wajib)' : '(opsional)'}
          </span>
          {receipt ? (
            <div className="receipt-preview">
              {/* blob: URL lokal, bukan aset yang bisa dioptimasi next/image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="receipt-thumb" src={receipt.url} alt="Pratinjau bukti pembayaran" />
              <span className="receipt-name">{receipt.name}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={clearReceipt}
                aria-label="Hapus bukti pembayaran"
              >
                &times;
              </button>
            </div>
          ) : (
            <label className="file-picker">
              <span>Ambil / pilih foto bukti</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>
      )}

      {paymentMethod === 'CASH' && (
        <div className="form-group">
          <label className="label" htmlFor="pos-cash">
            Uang Diterima
          </label>
          <div className="quick-cash">
            {QUICK_CASH.map((nominal) => (
              <button
                key={nominal}
                type="button"
                onClick={() => setCashReceived(String((received || 0) + nominal))}
              >
                +{nominal >= 1000 ? `${nominal / 1000}rb` : nominal}
              </button>
            ))}
            <button type="button" onClick={() => setCashReceived(String(total))}>
              Uang pas
            </button>
            <button type="button" onClick={() => setCashReceived('')}>
              Hapus
            </button>
          </div>
          <input
            id="pos-cash"
            className="input"
            type="text"
            inputMode="numeric"
            value={cashReceived ? Number(cashReceived).toLocaleString('id-ID') : ''}
            onChange={(e) => setCashReceived(String(digitsToInt(e.target.value) ?? ''))}
            placeholder="0"
          />
        </div>
      )}

      {summary}

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', minHeight: 'var(--tap-target)', marginTop: 16 }}
        disabled={loading || lines.length === 0}
      >
        {loading ? 'Mengirim...' : `Kirim - ${formatRupiah(total)}`}
      </button>

      {queue.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <span className="label">Antrean Offline ({queue.length})</span>
          {queue.map((entry) => (
            <div key={entry.clientTxId} className="pos-line-head" style={{ fontSize: '0.8125rem' }}>
              <span className="pos-line-name">
                {formatDateTimeWib(entry.createdAt)} &middot; {entry.paymentMethod}
                {entry.receiptKey || entry.receiptDataUrl ? ' (dengan bukti)' : ''}
              </span>
              <button
                type="button"
                className="pos-text-btn"
                onClick={() =>
                  replaceQueue(
                    token,
                    readQueue(token).filter((item) => item.clientTxId !== entry.clientTxId)
                  )
                }
              >
                Hapus
              </button>
            </div>
          ))}
          <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Antrean terkirim otomatis begitu internet kembali. Jangan tutup halaman ini sebelum
            antrean kosong.
          </p>
        </div>
      )}
    </form>
  )
}

/** Membentuk FormData yang dibaca submitTransaction. Satu fungsi untuk jalur
 *  online dan jalur antrean offline, supaya keduanya tidak bisa lagi berbeda
 *  bentuk. Versi lama melewati key `receiptFile` saat sinkronisasi sementara
 *  server membaca `receipt`, jadi bukti QRIS offline tidak pernah ikut terkirim. */
async function entryToFormData(entry) {
  const fd = new FormData()
  fd.append('token', entry.token)
  fd.append('items', entry.items)
  fd.append('paymentMethod', entry.paymentMethod)
  fd.append('cashReceived', entry.cashReceived || '')
  fd.append('buyerName', entry.buyerName || '')
  fd.append('customerPhone', entry.customerPhone || '')
  fd.append('clientTxId', entry.clientTxId)

  let file = entry.receiptFile || null
  if (!file && entry.receiptKey) file = await takeReceiptBlob(entry.receiptKey, entry.receiptName)
  if (!file && entry.receiptDataUrl) file = dataUrlToFile(entry.receiptDataUrl, entry.receiptName)
  if (file) fd.append('receipt', file)

  return fd
}
