'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock, RefreshCw, UtensilsCrossed } from 'lucide-react'
import { formatDateTimeWib, formatRupiah } from '@/lib/format'
import styles from './tableOrder.module.css'

const POLL_MS = 3000

const STATUS_COPY = {
  pending: {
    title: 'Menunggu pembayaran',
    sub: 'Selesaikan pembayaran di halaman Xendit. Nomor antrean dan rincian pesanan muncul otomatis di sini setelah pembayaran diterima.',
  },
  expired: {
    title: 'Pembayaran kedaluwarsa',
    sub: 'Waktu pembayaran habis dan pesanan belum dibayar. Silakan pesan ulang.',
  },
  failed: {
    title: 'Pesanan perlu ditindaklanjuti',
    sub: 'Pembayaran diterima, tetapi pesanan tidak bisa dicatat otomatis (kemungkinan stok berubah). Tunjukkan halaman ini ke kasir agar dibantu.',
  },
  amount_mismatch: {
    title: 'Nominal pembayaran tidak cocok',
    sub: 'Pembayaran diterima dengan nominal berbeda. Tunjukkan halaman ini ke kasir agar dibantu.',
  },
}

function itemSubtotal(item) {
  const price = Number(item?.price ?? 0)
  const qty = Number(item?.qty ?? 0)
  const subs = Array.isArray(item?.subs) ? item.subs : []
  const subsTotal = subs.reduce(
    (sum, sub) => sum + Number(sub?.price ?? 0) * Number(sub?.qty ?? 0),
    0
  )
  return price * qty + subsTotal
}

export default function TableOrderStatus({ orderId, storeId, tableNumber, storeName, initialStatus }) {
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const timerRef = useRef(null)
  const mountedRef = useRef(true)
  const statusRef = useRef(initialStatus || 'pending')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/on-the-table/orders/${orderId}`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)

      if (!mountedRef.current) return

      if (!res.ok) {
        setError(data?.error || 'Gagal memuat status pesanan.')
        return
      }

      statusRef.current = data.status
      setOrder(data)
      setError('')
    } catch {
      if (mountedRef.current) setError('Tidak ada koneksi. Mencoba lagi...')
    }
  }, [orderId])

  useEffect(() => {
    mountedRef.current = true
    // setTimeout (bukan load() langsung) supaya pemanggilan pertama tidak
    // dianggap setState sinkron di dalam effect.
    const first = setTimeout(load, 0)

    const tick = async () => {
      if (!mountedRef.current) return
      // Berhenti memutar polling setelah lunas/kedaluwarsa; tidak ada lagi
      // yang berubah dan setiap request ikut memanggil Xendit.
      if (statusRef.current !== 'pending') return
      if (document.visibilityState === 'visible') await load()
      schedule()
    }

    const schedule = () => {
      if (!mountedRef.current || statusRef.current !== 'pending') return
      timerRef.current = setTimeout(tick, POLL_MS)
    }

    schedule()

    return () => {
      mountedRef.current = false
      clearTimeout(first)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [load])

  const manualRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const status = order?.status || initialStatus || 'pending'
  const paid = status === 'paid'
  const copy = STATUS_COPY[status]

  return (
    <div className={styles.statusPage}>
      <div className={styles.statusShell}>
        <header style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {storeName || order?.storeName || 'Pesanan Anda'}
          </p>
          <h1 style={{ margin: '0.15rem 0 0', fontSize: '1.05rem', fontWeight: 800 }}>
            Meja {order?.tableNumber ?? tableNumber}
          </h1>
        </header>

        {error && <div className={`${styles.notice} ${styles.noticeWarning}`}>{error}</div>}

        {!order ? (
          <div className={styles.statusCard}>
            <p className={styles.statusSub} style={{ margin: 0 }}>
              Memuat status pesanan...
            </p>
          </div>
        ) : (
          <>
            <section className={styles.statusCard}>
              {paid ? (
                <>
                  <p className={styles.queueLabel}>Nomor Antrean</p>
                  <div className={styles.queueNumber}>{order.queueNumber ?? '—'}</div>
                  <p className={styles.statusTitle}>Pembayaran berhasil</p>
                  <p className={styles.statusSub}>
                    Pesanan sudah diteruskan ke kasir dan dapur. Simpan atau tunjukkan nomor ini
                    bila diperlukan.
                  </p>

                  <div className={styles.steps}>
                    <div className={`${styles.step} ${styles.stepDone}`}>Dibayar</div>
                    <div className={`${styles.step} ${styles.stepActive}`}>Disiapkan dapur</div>
                    <div className={styles.step}>Disajikan</div>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      color: 'var(--primary-color)',
                      marginBottom: '0.35rem',
                    }}
                    aria-hidden="true"
                  >
                    <Clock size={28} />
                  </div>
                  <p className={styles.statusTitle} style={{ marginTop: 0 }}>
                    {copy?.title || 'Memeriksa pembayaran...'}
                  </p>
                  <p className={styles.statusSub}>{copy?.sub}</p>

                  <div className={styles.steps}>
                    <div className={`${styles.step} ${styles.stepActive}`}>Pembayaran</div>
                    <div className={styles.step}>Dikonfirmasi</div>
                    <div className={styles.step}>Disiapkan</div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      marginTop: '1rem',
                    }}
                  >
                    {order.invoiceUrl && status === 'pending' && (
                      <a
                        className={`${styles.linkBtn} ${styles.primaryLink}`}
                        href={order.invoiceUrl}
                      >
                        Lanjutkan pembayaran
                      </a>
                    )}
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={manualRefresh}
                      disabled={refreshing}
                    >
                      <RefreshCw
                        size={14}
                        style={{ verticalAlign: '-2px', marginRight: 6 }}
                      />
                      {refreshing ? 'Memeriksa...' : 'Cek status pembayaran'}
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className={styles.receiptCard}>
              <div className={styles.receiptHead}>
                <h2 className={styles.receiptTitle}>Rincian pesanan</h2>
                <span className={styles.tablePill}>
                  {paid ? (
                    <>
                      <CheckCircle2 size={12} style={{ verticalAlign: '-2px', marginRight: 3 }} />
                      Lunas
                    </>
                  ) : (
                    'Belum dibayar'
                  )}
                </span>
              </div>

              {(order.items || []).map((item, index) => (
                <div key={`${item.product_id}-${index}`} className={styles.receiptLine}>
                  <div>
                    <p className={styles.receiptItemName}>
                      {item.qty}× {item.name}
                    </p>
                    {(item.subs || []).map((sub, subIndex) => (
                      <p key={`${sub.product_id}-${subIndex}`} className={styles.receiptItemSub}>
                        + {sub.qty}× {sub.name}
                      </p>
                    ))}
                  </div>
                  <span className={styles.receiptAmount}>{formatRupiah(itemSubtotal(item))}</span>
                </div>
              ))}

              <div className={styles.summaryRow} style={{ marginTop: '0.6rem' }}>
                <span>Subtotal</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Biaya layanan</span>
                <span>{formatRupiah(order.serviceFee)}</span>
              </div>
              <div className={styles.receiptTotalRow}>
                <span>Total</span>
                <span>{formatRupiah(order.amount)}</span>
              </div>

              {paid && order.paidAt && (
                <p
                  style={{
                    margin: '0.6rem 0 0',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                  }}
                >
                  Dibayar {formatDateTimeWib(order.paidAt)}
                </p>
              )}
            </section>

            <Link
              className={`${styles.linkBtn} ${paid ? '' : styles.primaryLink}`}
              href={`/t/${storeId}/${tableNumber}`}
            >
              <UtensilsCrossed size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              Pesan lagi
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
