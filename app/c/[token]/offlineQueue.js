'use client'

/**
 * Antrean transaksi offline.
 *
 * Kenapa jadi modul sendiri (temuan C6). Sebelumnya antrean ini state biasa di
 * dalam CashierForm dan dimuat lewat useEffect:
 *
 *   useEffect(() => { ... setOfflineQueue(JSON.parse(localStorage...)) }, [token])
 *   useEffect(() => { if (isOnline && offlineQueue.length > 0 && !syncing) syncQueue() },
 *             [isOnline, offlineQueue, syncing])
 *
 * `offlineQueue` array baru setiap kali di-set, jadi effect kedua memicu
 * dirinya sendiri terus-menerus. Sekarang snapshot-nya STABIL: selama string di
 * localStorage tidak berubah, referensi array yang sama dikembalikan, jadi
 * useSyncExternalStore tidak pernah memicu render palsu.
 *
 * Bukti QRIS disimpan sebagai Blob di Cache API dengan key deterministik
 * (`/receipts/<clientTxId>.jpg`). Versi lama memakai dua Date.now() yang
 * berbeda untuk menulis dan menyimpan key-nya, jadi blob-nya tidak pernah bisa
 * ditemukan lagi -- bukti pembayaran offline hilang tanpa jejak.
 */

const CACHE_NAME = 'yandihan-receipts'
const EMPTY = Object.freeze([])
const MAX_ENTRIES = 25

const listeners = new Set()
const snapshots = new Map() // token -> { raw, value }

export function queueKey(token) {
  return `yandihan_offline_queue_${token}`
}

export function receiptKeyFor(clientTxId) {
  return `/receipts/${clientTxId}.jpg`
}

function emit() {
  for (const listener of listeners) listener()
}

export function subscribeQueue(listener) {
  listeners.add(listener)
  const onStorage = () => {
    snapshots.clear()
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Snapshot stabil: referensi baru hanya kalau isi localStorage berubah. */
export function readQueue(token) {
  if (!token) return EMPTY
  let raw = ''
  try {
    raw = localStorage.getItem(queueKey(token)) || ''
  } catch {
    return EMPTY
  }
  const cached = snapshots.get(token)
  if (cached && cached.raw === raw) return cached.value

  let value = EMPTY
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      value = Array.isArray(parsed) ? parsed : EMPTY
    } catch {
      value = EMPTY
    }
  }
  snapshots.set(token, { raw, value })
  return value
}

export function serverQueue() {
  return EMPTY
}

function persist(token, entries) {
  try {
    localStorage.setItem(queueKey(token), JSON.stringify(entries))
  } catch {
    // Kuota penuh / penyimpanan diblokir: tidak ada yang bisa dilakukan selain
    // membiarkan antrean seperti apa adanya.
  }
  snapshots.delete(token)
  emit()
}

export function enqueue(token, entry) {
  const current = readQueue(token)
  if (current.length >= MAX_ENTRIES) {
    return { ok: false, reason: 'full', limit: MAX_ENTRIES }
  }
  persist(token, [...current, entry])
  return { ok: true }
}

export function replaceQueue(token, entries) {
  persist(token, entries)
}

export async function storeReceiptBlob(clientTxId, file) {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const key = receiptKeyFor(clientTxId)
    await cache.put(key, new Response(file, { headers: { 'content-type': file.type || 'image/jpeg' } }))
    return key
  } catch {
    return null
  }
}

export async function takeReceiptBlob(key, name) {
  if (!key || typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const res = await cache.match(key)
    if (!res) return null
    const blob = await res.blob()
    return new File([blob], name || 'bukti.jpg', { type: blob.type || 'image/jpeg' })
  } catch {
    return null
  }
}

export async function dropReceiptBlob(key) {
  if (!key || typeof caches === 'undefined') return
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.delete(key)
  } catch {
    // diabaikan
  }
}
