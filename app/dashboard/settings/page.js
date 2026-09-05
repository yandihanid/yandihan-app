import { createClient } from '@/utils/supabase/server'
import { verifySession, getMyStore } from '@/lib/dal'
import SettingsForm from './SettingsForm'
import AddCashierForm from './AddCashierForm'
import CashierRow from './CashierRow'
import ToggleReceiptRequired from './ToggleReceiptRequired'
import ToggleStoreSettings from './ToggleStoreSettings'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await verifySession('/dashboard/settings')

  // getMyStore(): maybeSingle() + order/limit. .single() dulu melempar PGRST116
  // untuk pemilik dengan lebih dari satu toko (temuan C11). Halaman ini juga
  // satu-satunya tempat "belum punya toko" adalah keadaan normal, jadi store
  // null di sini bukan error.
  const store = await getMyStore()

  const supabase = await createClient()
  const { data: cashiers } = store
    ? await supabase
        .from('cashiers')
        .select('id, name, token, device_id, telegram_chat_id, created_at')
        .eq('store_id', store.id)
        .order('created_at', { ascending: true })
    : { data: [] }

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <h2>Pengaturan Toko</h2>
      <div className="card">
        <h3>Profil Toko</h3>
        <SettingsForm store={store} userId={user.id} />

        {/* Toggle butuh store.id. Sebelumnya dirender juga saat toko belum ada,
            jadi PATCH-nya mengirim storeId undefined -> 400 -> alert "Gagal
            menyimpan" untuk setiap pengguna baru (temuan D5). */}
        {store ? (
          <div style={{ marginTop: '1.5rem' }}>
            <ToggleReceiptRequired storeId={store.id} initial={store.receipt_required ?? true} />
            <ToggleStoreSettings storeId={store.id} field="require_sub_product" label="Wajib Sub‑Produk" initial={store.require_sub_product ?? false} />
            <ToggleStoreSettings storeId={store.id} field="require_customer_name" label="Wajib Nama Pembeli" initial={store.require_customer_name ?? false} />
            <ToggleStoreSettings storeId={store.id} field="waiting_list_enabled" label="Waiting List Ticket" initial={store.waiting_list_enabled ?? false} />
          </div>
        ) : (
          <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Simpan nama toko dulu, setelah itu pengaturan lain bisa diatur di sini.
          </p>
        )}
      </div>

      <div className="card">
        <h3>Kasir Terhubung</h3>
        {store ? (
          <>
            <AddCashierForm storeId={store.id} />
            {cashiers?.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Kasir</th>
                    <th>Jenis</th>
                    <th>Link Kasir</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {cashiers.map((c) => <CashierRow key={c.id} cashier={c} />)}
                </tbody>
              </table>
            ) : <p>Belum ada kasir.</p>}
          </>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Buat toko dulu sebelum menambah kasir.
          </p>
        )}
      </div>
    </div>
  )
}
