import { Link2Off } from 'lucide-react'
import { getCashierPageSession } from '@/lib/cashierAuth'
import KitchenDisplay from '@/app/dashboard/kitchen/KitchenDisplay'
import LoginForm from '@/app/c/[token]/LoginForm'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Kitchen Display', robots: { index: false, follow: false } }

export default async function CashierKitchenPage({ params }) {
  const { token } = await params
  const { store, cashier } = await getCashierPageSession(token)

  if (!store) {
    return (
      <main className="cashier-gate">
        <section className="card cashier-gate-card" role="alert">
          <div className="cashier-gate-icon" aria-hidden="true"><Link2Off size={26} /></div>
          <h1>Link kasir tidak valid</h1>
        </section>
      </main>
    )
  }

  if (!cashier) {
    return <LoginForm token={token} storeName={store.name} />
  }

  return <KitchenDisplay storeId={store.id} storeName={store.name} token={token} />
}
