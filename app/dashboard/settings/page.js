import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'
import AddCashierForm from './AddCashierForm'

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
                  </tr>
                </thead>
                <tbody>
                  {cashiers.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: '500' }}>{c.name || 'Tanpa Nama'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {c.telegram_chat_id ? `Telegram (ID: ${c.telegram_chat_id})` : 'Hanya Web'}
                      </td>
                      <td>
                        {c.token ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              readOnly 
                              value={`yandihan.my.id/c/${c.token}`} 
                              className="input-field" 
                              style={{ padding: '0.4rem', fontSize: '0.8rem', width: '250px' }}
                            />
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
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
