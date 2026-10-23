import { createClient } from '@/utils/supabase/server'
import { verifySession, getMyStore } from '@/lib/dal'
import { isPro, maxCashiers } from '@/lib/plan'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import AddCashierForm from './AddCashierForm'
import CashierRow from './CashierRow'
import SettingToggle from './SettingToggle'
import SettingsForm from './SettingsForm'
import StoreCashierLink from './StoreCashierLink'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pengaturan Toko',
}

/**
 * Setelan boolean toko lewat satu komponen. Setiap deskripsi menjelaskan
 * perubahan yang terjadi saat tombolnya ditekan.
 */
const TOGGLES = [
  {
    field: 'receipt_required',
    title: 'Wajib bukti untuk QRIS/Transfer',
    description:
      'Kasir harus melampirkan foto bukti transfer sebelum transaksi non-tunai bisa dikirim.',
    fallback: true,
  },
  {
    field: 'require_customer_name',
    title: 'Wajib nama pembeli',
    description: 'Setiap transaksi harus punya nama pembeli. Berguna kalau pesanan diantar.',
    fallback: false,
  },
  {
    field: 'waiting_list_enabled',
    title: 'Mode antrean F&B',
    description:
      'Transaksi mendapat nomor antrean harian WIB. Link kasir menampilkan menu Belum selesai dan Selesai.',
    fallback: false,
  },
]

export default async function SettingsPage() {
  await verifySession('/dashboard/settings')

  // getMyStore(): maybeSingle() + order/limit. .single() dulu melempar PGRST116
  // untuk pemilik dengan lebih dari satu toko (temuan C11). Halaman ini juga
  // satu-satunya tempat "belum punya toko" adalah keadaan normal, jadi store
  // null di sini bukan error.
  const store = await getMyStore()

  const supabase = await createClient()
  const { data: cashierRows } = store
    ? await supabase
        .from('cashiers')
        .select('id, name, username, password_hash, created_at')
        .eq('store_id', store.id)
        .order('created_at', { ascending: true })
    : { data: [] }

  // password_hash tidak pernah dikirim ke browser, bahkan dalam bentuk hash.
  // Yang dibutuhkan UI hanya "sudah diatur atau belum".
  const cashiers = (cashierRows || []).map(({ password_hash, ...cashier }) => ({
    ...cashier,
    hasPassword: Boolean(password_hash),
  }))

  const pro = isPro(store)
  const limit = maxCashiers(store)
  const remaining = Number.isFinite(limit) ? Math.max(limit - cashiers.length, 0) : Infinity
  const canAddCashier = !store ? false : !Number.isFinite(limit) || cashiers.length < limit

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <h2>Pengaturan Toko</h2>

      <section className="card">
        <h3>Profil Toko</h3>
        {/* userId tidak lagi diturunkan sebagai prop: updateStore membaca
            user dari sesi di server. id pengguna yang datang dari browser
            tidak pernah menjadi dasar kepemilikan. */}
        <SettingsForm store={store} />

        {/* Toggle butuh store.id. Sebelumnya dirender juga saat toko belum ada,
            jadi PATCH-nya mengirim storeId undefined -> 400 -> alert "Gagal
            menyimpan" untuk setiap pengguna baru (temuan D5). */}
        {store ? (
          <div className="settings-toggles">
            {TOGGLES.map(({ field, title, description, fallback }) => (
              <SettingToggle
                key={field}
                storeId={store.id}
                field={field}
                title={title}
                description={description}
                initial={store[field] ?? fallback}
              />
            ))}
          </div>
        ) : (
          <Alert variant="info" live={false} className="settings-hint">
            Simpan nama toko dulu, setelah itu pengaturan lain bisa diatur di sini.
          </Alert>
        )}
      </section>

      <section className="card">
        <h3>Link & Akun Kasir</h3>
        {store ? (
          <>
            <StoreCashierLink storeId={store.id} token={store.cashier_token} />

            <div className="settings-divider" />

            {canAddCashier ? (
              <AddCashierForm storeId={store.id} isPro={pro} remaining={remaining} />
            ) : (
              <Alert variant="info" live={false} className="settings-quota">
                <strong>Kuota akun kasir paket GRATIS sudah terpakai.</strong>
                <span>
                  Paket GRATIS mendukung 1 akun kasir. Upgrade ke PRO untuk menambahkan akun
                  sebanyak kebutuhan tim — semuanya tetap memakai satu link toko.
                </span>
                <Button href="/dashboard/billing" size="sm">
                  Upgrade ke PRO
                </Button>
              </Alert>
            )}

            {cashiers.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Kasir</th>
                      <th>Username</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashiers.map((cashier) => (
                      <CashierRow key={cashier.id} cashier={cashier} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>
                Belum ada akun kasir. Tambahkan akun pertama agar link di atas bisa dipakai.
              </p>
            )}
          </>
        ) : (
          <Alert variant="info" live={false}>
            Buat toko dulu sebelum menambah akun kasir.
          </Alert>
        )}
      </section>
    </div>
  )
}
