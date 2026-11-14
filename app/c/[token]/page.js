import { Link2Off } from 'lucide-react'
import { getCashierPageSession } from '@/lib/cashierAuth'
import { normalizeTheme } from '@/lib/storeTheme'
import CashierApp from './CashierApp'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Kasir',
  robots: { index: false, follow: false },
}

/**
 * Satu pintu masuk untuk semua kasir sebuah toko.
 *
 * Link /c/<token> hanya mengidentifikasi toko. Isi halaman ditentukan oleh
 * sesi login di cookie: tanpa sesi tampil form username + kata sandi, dengan
 * sesi tampil layar kasir. Pemeriksaan dilakukan di server, bukan di browser.
 */
export default async function CashierPage({ params }) {
  const { token } = await params
  const { store, cashier, supabase } = await getCashierPageSession(token)

  if (!store) {
    return (
      <main className="cashier-gate">
        <section className="card cashier-gate-card" role="alert">
          <div className="cashier-gate-icon" aria-hidden="true">
            <Link2Off size={26} />
          </div>
          <h1>Link kasir tidak valid</h1>
          <p>
            Link ini sudah tidak berlaku. Minta pemilik toko menyalin ulang link kasir dari
            menu Pengaturan.
          </p>
        </section>
      </main>
    )
  }

  // Warna dasar toko. Diteruskan lewat atribut data-store-theme pada
  // elemen pembungkus: variabel CSS mewarisi, jadi seluruh isi halaman
  // (login, layar kasir, antrean) ikut memakai warna toko.
  const theme = normalizeTheme(store.theme_color)

  if (!cashier) {
    return (
      <div className="store-theme" data-store-theme={theme}>
        <LoginForm token={token} storeName={store.name} />
      </div>
    )
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock, is_sub_product, image_url, category')
    .eq('store_id', store.id)
    .order('name', { ascending: true })

  // cashier_token tidak ikut dikirim ke browser: token sudah ada di URL, dan
  // tidak ada komponen client yang membutuhkannya.
  const publicStore = {
    id: store.id,
    name: store.name,
    subscription_tier: store.subscription_tier,
    subscription_end_date: store.subscription_end_date,
    receipt_required: store.receipt_required,
    require_customer_name: store.require_customer_name,
    waiting_list_enabled: store.waiting_list_enabled,
    on_table_enabled: store.on_table_enabled,
    pelanggan_enabled: store.pelanggan_enabled,
    visit_threshold: store.visit_threshold,
    discount_percent: store.discount_percent,
    logo_url: store.logo_url,
    theme_color: theme,
  }

  return (
    <div className="store-theme" data-store-theme={theme}>
      <CashierApp
        token={token}
        cashier={{ id: cashier.id, name: cashier.name }}
        store={publicStore}
        products={products || []}
      />
    </div>
  )
}
