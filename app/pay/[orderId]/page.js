import { createServiceClient } from '@/utils/supabase/service'
import { formatRupiah } from '@/lib/format'
import { normalizeTheme } from '@/lib/storeTheme'
import styles from './pay.module.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pembayaran',
  robots: { index: false, follow: false },
}

const ORDER_FIELDS = `
  id,
  store_id,
  table_number,
  items,
  subtotal,
  service_fee,
  amount,
  status,
  invoice_url
`

const STORE_FIELDS = 'id, name, address, phone, logo_url, theme_color'
const STORE_FIELDS_WITHOUT_THEME = 'id, name, address, phone, logo_url'

/**
 * Halaman bayar milik toko.
 *
 * Halaman ini berdiri di antara pesanan meja dan halaman pembayaran Xendit.
 * Alasannya: halaman Xendit menampilkan nama akun platform, bukan nama usaha
 * yang dilihat pelanggan. Padahal dari sudut pandang pelanggan, yang harus
 * tampil adalah nama dan logo TOKONYA.
 *
 * Jadi halaman ini menampilkan logo + nama usaha (dari Dashboard -> Pengaturan)
 * beserta rincian pesanan, lalu mengarahkan pelanggan ke invoice Xendit dengan
 * satu tombol. Tidak ada data kartu atau pembayaran yang lewat halaman ini --
 * pembayaran tetap 100% di Xendit.
 */
export default async function PayPage({ params }) {
  const { orderId } = await params
  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from('table_orders')
    .select(ORDER_FIELDS)
    .eq('id', orderId)
    .maybeSingle()

  if (!order) {
    return (
      <Shell theme="blue">
        <section className={styles.card}>
          <h1 className={styles.title}>Pesanan tidak ditemukan</h1>
          <p className={styles.sub}>
            Tautan pembayaran ini tidak berlaku. Silakan pesan ulang dari meja Anda.
          </p>
        </section>
      </Shell>
    )
  }

  let store = null
  const storeWithTheme = await supabase
    .from('stores')
    .select(STORE_FIELDS)
    .eq('id', order.store_id)
    .maybeSingle()

  if (!storeWithTheme?.error && storeWithTheme?.data) {
    store = storeWithTheme.data
  } else {
    const fallback = await supabase
      .from('stores')
      .select(STORE_FIELDS_WITHOUT_THEME)
      .eq('id', order.store_id)
      .maybeSingle()
    store = fallback?.data ?? null
  }

  const theme = normalizeTheme(store?.theme_color)
  const items = Array.isArray(order.items) ? order.items : []
  const paid = order.status === 'paid'
  const invoiceUrl = order.invoice_url

  return (
    <Shell theme={theme}>
      <section className={styles.card}>
        <header className={styles.brand}>
          {store?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.logo} src={store.logo_url} alt={store?.name || 'Logo toko'} />
          )}
          <h1 className={styles.storeName}>{store?.name || 'Toko'}</h1>
          {store?.address && <p className={styles.storeMeta}>{store.address}</p>}
          {store?.phone && <p className={styles.storeMeta}>{store.phone}</p>}
          <p className={styles.tablePill}>Meja {order.table_number}</p>
        </header>

        <h2 className={styles.title}>Rincian Pesanan</h2>

        <ul className={styles.lines}>
          {items.map((item, index) => (
            <li key={`${item.product_id}-${index}`} className={styles.line}>
              <span className={styles.lineName}>
                {item.qty}× {item.name}
                {(item.subs || []).map((sub, subIndex) => (
                  <span key={`${sub.product_id}-${subIndex}`} className={styles.lineSub}>
                    + {sub.qty}× {sub.name}
                  </span>
                ))}
              </span>
              <span className={styles.lineAmount}>
                {formatRupiah(Number(item.price ?? 0) * Number(item.qty ?? 0))}
              </span>
            </li>
          ))}
        </ul>

        <div className={styles.summaryRow}>
          <span>Subtotal</span>
          <span>{formatRupiah(order.subtotal ?? 0)}</span>
        </div>
        {Number(order.service_fee ?? 0) > 0 && (
          <div className={styles.summaryRow}>
            <span>Biaya layanan</span>
            <span>{formatRupiah(order.service_fee ?? 0)}</span>
          </div>
        )}
        <div className={styles.totalRow}>
          <span>Total Bayar</span>
          <span>{formatRupiah(order.amount ?? 0)}</span>
        </div>

        {paid ? (
          <p className={styles.notice}>
            Pesanan ini sudah lunas. Nomor antrean muncul di halaman status pesanan.
          </p>
        ) : invoiceUrl ? (
          <>
            <a className={styles.payButton} href={invoiceUrl} rel="noopener noreferrer">
              Bayar Sekarang
            </a>
            <p className={styles.secureNote}>
              Pembayaran aman lewat Xendit (QRIS, transfer bank, atau e-wallet).
            </p>
          </>
        ) : (
          <p className={styles.notice}>
            Link pembayaran untuk pesanan ini belum tersedia. Silakan pesan ulang.
          </p>
        )}
      </section>
    </Shell>
  )
}

function Shell({ theme, children }) {
  return (
    <div className="store-theme" data-store-theme={theme}>
      <main className={styles.page}>{children}</main>
    </div>
  )
}
