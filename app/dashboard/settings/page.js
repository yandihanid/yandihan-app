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

  const { data: store } = await supabase.from('stores').select('*').eq('user_id', user.id).single()
  const { data: cashiers } = store ? await supabase.from('cashiers').select('*').eq('store_id', store.id) : { data: [] }

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <h2>Pengaturan Toko</h2>
      <div className="card">
        <h3>Profil Toko</h3>
        <SettingsForm store={store} userId={user.id} />
        <div style={{ marginTop: '1.5rem' }}>
          <ToggleReceiptRequired storeId={store?.id} initial={store?.receipt_required ?? true} />
          <ToggleStoreSettings storeId={store?.id} field="require_sub_product" label="Wajib Sub‑Produk" initial={store?.require_sub_product ?? false} />
          <ToggleStoreSettings storeId={store?.id} field="require_customer_name" label="Wajib Nama Pembeli" initial={store?.require_customer_name ?? false} />
          <ToggleStoreSettings storeId={store?.id} field="waiting_list_enabled" label="Waiting List Ticket" initial={store?.waiting_list_enabled ?? false} />
        </div>
      </div>
      <div className="card">
        <h3>Kasir Terhubung</h3>
        <AddCashierForm storeId={store?.id} />
        {cashiers?.length ? (
          <table>
            <tbody>
              {cashiers.map((c) => <CashierRow key={c.id} cashier={c} />)}
            </tbody>
          </table>
        ) : <p>Belum ada kasir.</p>}
      </div>
    </div>
  )
}
