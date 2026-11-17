// KEAMANAN (temuan A4): halaman ini PUBLIK — link struk dibagikan ke pembeli.
// Query harus tetap berupa allowlist kolom agar token kasir, device binding, dan
// PII pelanggan tidak pernah ikut terbaca atau ter-serialize ke HTML.
import { createServiceClient } from '@/utils/supabase/service'
import { formatDateTimeWib, formatRupiah, shortTxNumber } from '@/lib/format'
import { normalizeReceiptPrinter } from '@/lib/receiptPrinter'
import { normalizeTheme } from '@/lib/storeTheme'
import AutoPrint from './AutoPrint'
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
  stores(name, address, phone, logo_url, theme_color, receipt_printer),
  cashiers(name),
  transaction_items(name, unit_price, qty, line_total, parent_item_id, line_index, sub_index)
`

// Bentuk lama, tanpa kolom logo. Dipakai hanya kalau select di atas gagal
// karena database belum menjalankan migrasi 0020 (kolom logo_url belum ada).
// Tanpa fallback ini, satu migrasi yang belum dijalankan membuat SEMUA struk
// terbaca sebagai "Struk Tidak Ditemukan" — halaman publik yang dipakai
// pelanggan dan kasir.
const RECEIPT_FIELDS_WITHOUT_LOGO = `
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

// Bentuk dengan branding tapi tanpa tema/ukuran printer (migrasi 0023 belum
// dijalankan).
const RECEIPT_FIELDS_WITHOUT_THEME = `
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
  stores(name, address, phone, logo_url),
  cashiers(name),
  transaction_items(name, unit_price, qty, line_total, parent_item_id, line_index, sub_index)
`

/**
 * Ambil struk. Kalau select utama gagal, ulangi dengan daftar kolom yang
 * lebih pendek.
 *
 * Alasannya sederhana: PostgREST menolak seluruh query kalau satu kolom yang
 * diminta tidak ada. Jadi "logo belum ada" tidak boleh mengubah "struk ini
 * tidak ada" menjadi "struk tidak bisa dimuat".
 */
async function loadReceipt(supabase, id) {
  const variants = [RECEIPT_FIELDS, RECEIPT_FIELDS_WITHOUT_THEME, RECEIPT_FIELDS_WITHOUT_LOGO]

  let last = { data: null, error: null }
  for (const fields of variants) {
    const result = await supabase.from('transactions').select(fields).eq('id', id).maybeSingle()
    if (!result?.error) return result
    last = result
  }
  return last
}

function sortItems(items = []) {
  return [...items].sort((a, b) => {
    const lineDifference = Number(a.line_index ?? 0) - Number(b.line_index ?? 0)
    if (lineDifference) return lineDifference
    return Number(a.sub_index ?? 0) - Number(b.sub_index ?? 0)
  })
}

/**
 * Ukuran huruf struk untuk lebar kertas tertentu.
 *
 * Angka dalam poin (pt), bukan rem: ukuran di printer thermal ditentukan
 * dalam poin, dan memakai rem membuat tampilan di layar dan di kertas
 * berbeda. Untuk 58 mm, huruf 9 pt masih terbaca jelas, dan struk tidak
 * perlu diperkecil lagi di dialog cetak browser.
 */
const PRINT_SIZES = {
  58: {
    base: '9pt',
    title: '11pt',
    meta: '7.5pt',
    total: '10pt',
    logo: '90px',
    margin: '2mm',
    dividerMargin: '0.5rem',
    footerMargin: '1rem',
  },
  80: {
    base: '10pt',
    title: '13pt',
    meta: '8pt',
    total: '11.5pt',
    logo: '130px',
    margin: '4mm',
    dividerMargin: '1rem',
    footerMargin: '2rem',
  },
}

export default async function ReceiptPage({ params, searchParams }) {
  const { id } = await params
  const query = (await searchParams) || {}

  // `copy=1` dipakai kasir dari menu Antrean: struk ini cetakan kedua atau
  // seterusnya, jadi diberi label COPY.
  const isCopy = String(query.copy || '') === '1'
  // `print=1` supaya printer langsung keluar begitu struk terbuka.
  const autoPrint = String(query.print || '') === '1'

  const supabase = createServiceClient()

  const { data: tx, error: txError } = await loadReceipt(supabase, id)

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

  const printerWidth = normalizeReceiptPrinter(tx.stores?.receipt_printer)
  const sizes = PRINT_SIZES[printerWidth]
  const theme = normalizeTheme(tx.stores?.theme_color)

  return (
    <div className="store-theme" data-store-theme={theme}>
      {/* Aturan @page hanya boleh ditulis satu kali per dokumen, jadi lebar
          kertas Emit di sini (bukan di CSS module) supaya ukurannya ikut
          mengikuti setelan printer toko. */}
      <style>{`
        @page { size: ${printerWidth}mm auto; margin: ${sizes.margin}; }
        @media print {
          html, body { width: ${printerWidth}mm !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <main className={styles.page}>
        <article
          className={styles.receipt}
          style={{
            '--receipt-font-size': sizes.base,
            '--receipt-title-size': sizes.title,
            '--receipt-meta-size': sizes.meta,
            '--receipt-total-size': sizes.total,
            '--receipt-logo-size': sizes.logo,
            '--receipt-divider-margin': sizes.dividerMargin,
            '--receipt-footer-margin': sizes.footerMargin,
          }}
        >
          <header className={styles.header}>
            {tx.stores?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.storeLogo}
                src={tx.stores.logo_url}
                alt={tx.stores?.name ? `Logo ${tx.stores.name}` : 'Logo toko'}
              />
            )}
            <h1 className={styles.storeName}>{tx.stores?.name || 'Toko'}</h1>
            {tx.stores?.address && <p className={styles.storeDetail}>{tx.stores.address}</p>}
            {tx.stores?.phone && <p className={styles.storeDetail}>{tx.stores.phone}</p>}
            <p className={styles.headerLine}>Bukti Pembayaran</p>
            {isCopy && (
              <p className={styles.copyBadge} data-testid="copy-badge">
                COPY
              </p>
            )}
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

        <PrintButton
          storeId={tx.stores?.id ?? null}
          receipt={{
            storeName: tx.stores?.name || 'Toko',
            address: tx.stores?.address || undefined,
            phone: tx.stores?.phone || undefined,
            items,
            subtotal,
            discount: discountAmount,
            total: Number(tx.amount ?? 0),
            paymentMethod: tx.payment_method,
            cashReceived: tx.cash_received != null ? Number(tx.cash_received) : undefined,
            change: tx.change_amount != null ? Number(tx.change_amount) : undefined,
            dateTime: formatDateTimeWib(tx.created_at),
            cashierName: tx.cashiers?.name || undefined,
            queueNumber: tx.queue_number ?? undefined,
            copy: isCopy,
          }}
        />
      </main>

      <AutoPrint enabled={autoPrint} />
    </div>
  )
}
