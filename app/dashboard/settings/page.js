import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'
import AddCashierForm from './AddCashierForm'
import CashierRow from './CashierRow'
import ToggleReceiptRequired from './ToggleReceiptRequired'
import ToggleStoreSettings from './ToggleStoreSettings'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', user.id)
    .single()

  let cashiers = []
  if (store) {
    const { data } = await supabase
      .from('cashiers')
      .select('*')
      .eq('store_id', store.id)
    cashiers = data || []
  }

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Pengaturan Toko</h2>
      
      <div className="card">
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Profil Toko</h3>
        <SettingsForm store={store} userId={user.id} />
        <div style={{ marginTop: '1.5rem' }}>
          <ToggleReceiptRequired storeId={store?.id} initial={store?.receipt_required ?? true} />
          <ToggleStoreSettings storeId={store?.id} field="require_sub_product" label="Wajib ada Sub‑Produk" initial={store?.require_sub_product ?? false} />
          <ToggleStoreSettings storeId={store?.id} field="require_customer_name" label="Wajib ada Nama Pembeli" initial={store?.require_customer_name ?? false} />
          <ToggleStoreSettings storeId={store?.id} field="waiting_list_enabled" label="Aktifkan Waiting List Ticket" initial={store?.waiting_list_enabled ?? false} />
        </div>
      </div>

      <div className="card" style={{ backgroundColor: 'var(--secondary-color)', border: '1px solid var(--primary-light, #DBEAFE)' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Pusat Bantuan &amp; Aplikasi</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>Pelajari cara menggunakan Yandihan atau unduh aplikasi Android Kasir untuk input transaksi offline.</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a href="/guide" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', textDecoration: 'none', borderRadius: '8px' }}>
            📖 Buka Panduan
          </a>
          <a href="/yandihan-kasir.apk" download className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', borderRadius: '8px' }}>
            📲 Download APK Kasir
          </a>
        </div>
      </div>

      {store && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Kasir Terhubung</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Anda bisa menambahkan kasir di sini untuk mendapatkan Link Web, atau suruh kasir chat Telegram bot dengan `/start {store.unique_code}`.
            </p>
            <AddCashierForm storeId={store.id} />
          </div>
          
          {cashiers.length === 0 ? (
            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Belum ada kasir yang terhubung. Minta kasir mengirimkan pesan <code>/start {store.unique_code}</code> ke bot Telegram.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nama Kasir</th>
                    <th>Akses (Telegram/Web)</th>
                    <th>Link Web Kasir</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {cashiers.map(c => (
                    <CashierRow key={c.id} cashier={c} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
