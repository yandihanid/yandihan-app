import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'

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
                    <th>Nama Telegram</th>
                    <th>ID Telegram</th>
                    <th>Waktu Terhubung</th>
                  </tr>
                </thead>
                <tbody>
                  {cashiers.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: '500' }}>{c.telegram_name || 'Tanpa Nama'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{c.telegram_chat_id}</td>
                      <td>{new Date(c.created_at).toLocaleString('id-ID')}</td>
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
