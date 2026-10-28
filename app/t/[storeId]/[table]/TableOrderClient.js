'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Plus, Minus, ShoppingBag } from 'lucide-react'
import { formatRupiah } from '@/lib/format'
import styles from './tableOrder.module.css'

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

export default function TableOrderClient({
  store,
  tableNumber,
  tableLabel,
  products,
  serviceFee = 0,
}) {
  const router = useRouter()
  const [cart, setCart] = useState({})
  const [query, setQuery] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const menu = useMemo(
    () => (products || []).filter((p) => !p.is_sub_product),
    [products]
  )

  const stockOf = (product) => Math.max(0, Number(product?.stock ?? 0))

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return menu
    return menu.filter((p) => String(p.name).toLowerCase().includes(q))
  }, [menu, query])

  const lines = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, qty]) => {
        const product = menu.find((p) => p.id === productId)
        if (!product || qty <= 0) return null
        return { product, qty, lineTotal: Number(product.price) * qty }
      })
      .filter(Boolean)
  }, [cart, menu])

  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0)
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const fee = itemCount > 0 ? Number(serviceFee || 0) : 0
  const total = subtotal + fee

  const add = (product) => {
    const stock = stockOf(product)
    if (stock <= 0) return
    setError(null)
    setCart((prev) => {
      const next = { ...prev }
      const current = next[product.id] || 0
      if (current >= stock) return prev
      next[product.id] = current + 1
      return next
    })
  }

  const remove = (product) => {
    setError(null)
    setCart((prev) => {
      const next = { ...prev }
      const current = next[product.id] || 0
      if (current <= 1) delete next[product.id]
      else next[product.id] = current - 1
      return next
    })
  }

  const checkout = async () => {
    if (itemCount === 0) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/on-the-table/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          tableNumber,
          items: lines.map((line) => ({ product_id: line.product.id, qty: line.qty })),
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.invoiceUrl) {
        setError(data?.error || 'Gagal membuat pembayaran. Coba lagi.')
        // Stok berubah di server: muat ulang katalog supaya angka di layar benar.
        if (res.status === 409) router.refresh()
        return
      }

      window.location.assign(data.invoiceUrl)
    } catch {
      setError('Koneksi terputus. Periksa internet lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandBlock}>
            <h1 className={styles.brand}>{store.name}</h1>
            <p className={styles.brandSub}>
              {tableLabel ? tableLabel : store.address || 'Pesan langsung dari meja Anda'}
            </p>
          </div>
          <span className={styles.tableBadge}>
            Meja <strong>{tableNumber}</strong>
          </span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden="true">
            <Search size={16} />
          </span>
          <input
            className={styles.search}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari menu..."
            aria-label="Cari menu"
          />
        </div>

        <h2 className={styles.sectionTitle}>
          Menu
          <span className={styles.sectionHint}>{menu.length} pilihan</span>
        </h2>

        {visible.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon} aria-hidden="true">
              🍽️
            </div>
            <p style={{ margin: 0, fontWeight: 700 }}>Menu tidak ditemukan</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              Coba kata kunci lain.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {visible.map((product) => {
              const stock = stockOf(product)
              const soldOut = stock <= 0
              const qty = cart[product.id] || 0
              const lowStock = !soldOut && stock <= 3

              return (
                <article
                  key={product.id}
                  className={`${styles.card}${soldOut ? ` ${styles.cardSoldOut}` : ''}`}
                >
                  <div className={styles.imageWrap}>
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className={styles.image}
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.placeholder} aria-hidden="true">
                        {initials(product.name)}
                      </div>
                    )}

                    {soldOut ? (
                      <div className={styles.soldOutOverlay}>Habis</div>
                    ) : (
                      <span
                        className={`${styles.stockChip}${lowStock ? ` ${styles.stockChipLow}` : ''}`}
                      >
                        Stok {stock}
                      </span>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <h3 className={styles.name}>{product.name}</h3>
                    <p className={styles.price}>{formatRupiah(product.price)}</p>

                    <div className={styles.cardFooter}>
                      {soldOut ? (
                        <button type="button" className={styles.addBtn} disabled>
                          Stok habis
                        </button>
                      ) : qty === 0 ? (
                        <button
                          type="button"
                          className={styles.addBtn}
                          onClick={() => add(product)}
                        >
                          Tambah
                        </button>
                      ) : (
                        <div className={styles.stepper}>
                          <button
                            type="button"
                            className={styles.stepperBtn}
                            onClick={() => remove(product)}
                            aria-label={`Kurangi ${product.name}`}
                          >
                            <Minus size={14} />
                          </button>
                          <span className={styles.stepperValue} aria-live="polite">
                            {qty}
                          </span>
                          <button
                            type="button"
                            className={styles.stepperBtn}
                            onClick={() => add(product)}
                            disabled={qty >= stock}
                            aria-label={`Tambah ${product.name}`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {itemCount > 0 && (
        <div className={styles.cartBar}>
          <div className={styles.cartBarInner}>
            <div className={styles.cartInfo}>
              <span className={styles.cartCount}>{itemCount} item dipilih</span>
              <span className={styles.cartTotal}>{formatRupiah(total)}</span>
            </div>
            <button
              type="button"
              className={styles.cartBtn}
              onClick={() => setSheetOpen(true)}
            >
              <ShoppingBag size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
              Lihat Pesanan
            </button>
          </div>
        </div>
      )}

      {sheetOpen && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Rincian pesanan"
          onClick={() => (loading ? null : setSheetOpen(false))}
        >
          <div className={styles.sheet} onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>Rincian Pesanan</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSheetOpen(false)}
                disabled={loading}
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.sheetBody}>
              {lines.map((line) => (
                <div key={line.product.id} className={styles.line}>
                  <div className={styles.lineInfo}>
                    <p className={styles.lineName}>{line.product.name}</p>
                    <p className={styles.lineMeta}>{formatRupiah(line.product.price)} / item</p>
                    <div className={styles.sheetStepper}>
                      <button
                        type="button"
                        className={styles.roundBtn}
                        onClick={() => remove(line.product)}
                        disabled={loading}
                        aria-label={`Kurangi ${line.product.name}`}
                      >
                        <Minus size={13} />
                      </button>
                      <span className={styles.qtyLabel}>{line.qty}</span>
                      <button
                        type="button"
                        className={styles.roundBtn}
                        onClick={() => add(line.product)}
                        disabled={loading || line.qty >= stockOf(line.product)}
                        aria-label={`Tambah ${line.product.name}`}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  <span className={styles.linePrice}>{formatRupiah(line.lineTotal)}</span>
                </div>
              ))}
            </div>

            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Biaya layanan</span>
                <span>{formatRupiah(fee)}</span>
              </div>
              <div className={styles.totalRow}>
                <span>Total</span>
                <span>{formatRupiah(total)}</span>
              </div>
            </div>

            <div className={styles.sheetFooter}>
              {error && <div className={styles.error}>{error}</div>}
              <button
                type="button"
                className={styles.checkoutBtn}
                onClick={checkout}
                disabled={loading || itemCount === 0}
              >
                {loading ? 'Mengalihkan ke pembayaran...' : `Bayar ${formatRupiah(total)}`}
              </button>
              <p
                style={{
                  margin: '0.6rem 0 0',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                Pembayaran aman lewat Xendit (QRIS, transfer bank, atau e-wallet).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
