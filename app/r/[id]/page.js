// KEAMANAN (temuan A4): halaman ini PUBLIK — link struk dibagikan ke pembeli.
// Query harus tetap berupa allowlist kolom agar token kasir, device binding, dan
// PII pelanggan tidak pernah ikut terbaca atau ter-serialize ke HTML.
import { createServiceClient } from '@/utils/supabase/service'
import { formatDateTimeWib, formatRupiah, shortTxNumber } from '@/lib/format'
import PrintButton from './PrintButton'
import styles from './receipt.module.css'

export const dynamic = 'force-dynamic'

const RECEIPT_FIELDS = `
  id,
  amount,
  original_amount,
  discount_percent,
  product_name,
  payment_method,
  receipt_url,
  cash_received,
  change_amount,
  queue_number,
  created_at,
  stores(name, address, phone),
  cashiers(name),
  transaction_items(name, unit_price, qty, line_total, parent_item_id, line_index, sub_index)
`

function sortItems(items = []) {
  return [...items].sort((a, b) => {
    const lineDifference = Number(a.line_index ?? 0) - Number(b.line_index ?? 0)
    if (lineDifference) return lineDifference
    return Number(a.sub_index ?? 0) - Number(b.sub_index ?? 0)
  })
}

export default async function ReceiptPage({ params }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .select(RECEIPT_FIELDS)
    .eq('id', id)
    .maybeSingle()

  if (txError || !tx) {
    return (
      <div className={styles.notFound}>
        <h1>Struk Tidak Ditemukan</h1>
        <p>Link struk ini tidak berlaku atau sudah dihapus.</p>
      </div>
    )
  }

  const items = sortItems(tx.transaction_items)
  const subtotal = tx.original_amount ?? tx.amount
  const discountAmount = Math.max(Number(subtotal) - Number(tx.amount), 0)
  const discountPercent = Number(tx.discount_percent ?? 0)

  return (
    <main className={styles.page}>
      <article className={styles.receipt}>
        <header className={styles.header}>
          <h1 className={styles.storeName}>{tx.stores?.name || 'Toko'}</h1>
          {tx.stores?.address && <p className={styles.storeDetail}>{tx.stores.address}</p>}
          {tx.stores?.phone && <p className={styles.storeDetail}>{tx.stores.phone}</p>}
          <p className={styles.headerLine}>Bukti Pembayaran</p>
          <p className={styles.headerLine}>No. {shortTxNumber(tx.id)}</p>
          {tx.queue_number != null && (
            <p className={styles.headerLine} style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              Antrean #{tx.queue_number}
            </p>
          )}
          <p className={styles.headerLine}>{formatDateTimeWib(tx.created_at)}</p>
        </header>

        <hr className={styles.divider} />

        <div className={styles.row}>
          <span>Kasir:</span>
          <span>{tx.cashiers?.name || 'Kasir'}</span>
        </div>
        <div className={styles.row}>
          <span>Metode:</span>
          <span>{tx.payment_method}</span>
        </div>
        {tx.payment_method === 'QRIS/TF' && tx.receipt_url && (
          <div className={styles.row}>
            <span>Bukti TF:</span>
            <a
              className={styles.proofLink}
              href={tx.receipt_url}
              target="_blank"
              rel="noreferrer"
            >
              Terlampir
            </a>
          </div>
        )}

        <hr className={styles.divider} />

        {items.length ? (
          items.map((item, index) => {
            const isSubItem = Number(item.sub_index ?? 0) > 0 || item.parent_item_id != null
            return (
              <div
                className={`${styles.item} ${isSubItem ? styles.subItem : ''}`}
                key={`${item.line_index}-${item.sub_index}-${index}`}
              >
                <div className={styles.row}>
                  <span className={styles.itemName}>{isSubItem ? `↳ ${item.name}` : item.name}</span>
                  <span>{formatRupiah(item.line_total)}</span>
                </div>
                <div className={styles.itemMeta}>
                  {item.qty} × {formatRupiah(item.unit_price)}
                </div>
              </div>
            )
          })
        ) : (
          <div className={styles.row}>
            <span>{tx.product_name || 'Pembelian'}</span>
            <span>{formatRupiah(tx.amount)}</span>
          </div>
        )}

        <hr className={styles.divider} />

        <div className={styles.row}>
          <span>Subtotal:</span>
          <span>{formatRupiah(subtotal)}</span>
        </div>
        {(discountPercent > 0 || discountAmount > 0) && (
          <div className={styles.row}>
            <span>Diskon{discountPercent > 0 ? ` (${discountPercent}%)` : ''}:</span>
            <span>-{formatRupiah(discountAmount)}</span>
          </div>
        )}
        <div className={`${styles.row} ${styles.total}`}>
          <span>Total:</span>
          <span>{formatRupiah(tx.amount)}</span>
        </div>

        {tx.payment_method === 'CASH' && (
          <>
            {tx.cash_received != null && (
              <div className={styles.row}>
                <span>Uang Diterima:</span>
                <span>{formatRupiah(tx.cash_received)}</span>
              </div>
            )}
            {tx.change_amount != null && (
              <div className={styles.row}>
                <span>Kembalian:</span>
                <span>{formatRupiah(tx.change_amount)}</span>
              </div>
            )}
          </>
        )}

        <hr className={styles.divider} />

        <footer className={styles.footer}>
          <p className={styles.footerText}>Terima kasih atas kunjungan Anda!</p>
          <p className={styles.poweredBy}>Powered by Yandihan</p>
        </footer>
      </article>

      <PrintButton />
    </main>
  )
}
