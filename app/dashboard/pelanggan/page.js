import { verifySession, getMyStore } from '@/lib/dal'
import { planTier } from '@/lib/plan'
import OnboardingChecklist from '../OnboardingChecklist'
import PelangganClient from './PelangganClient'

export const dynamic = 'force-dynamic'

/**
 * Menu Pelanggan (loyalitas).
 *
 * Dulu seluruh halaman ini 'use client' dan memulai hidupnya dengan
 * fetch('/api/store/my') di useEffect. Kalau pengguna belum punya toko, route
 * itu menjawab 404 dan halaman menerjemahkannya jadi layar merah "Gagal memuat
 * data toko" — padahal belum punya toko bukan kegagalan, itu keadaan awal
 * setiap akun baru (temuan K5). Sekarang toko dibaca di server, dan keadaan
 * "belum punya toko" memakai OnboardingChecklist yang sama dengan /dashboard.
 *
 * Bentuk `store` yang diturunkan ke client sengaja dipertahankan sama dengan
 * response /api/store/my (termasuk `plan` huruf kecil dari planTier) supaya
 * PelangganClient tidak perlu tahu dari mana datanya datang.
 */
export const metadata = {
  title: 'Menu Pelanggan',
}

export default async function PelangganPage() {
  await verifySession('/dashboard/pelanggan')

  const store = await getMyStore()

  if (!store) {
    return (
      <div className="animate-fade-in flex flex-col gap-4">
        <OnboardingChecklist store={null} />
      </div>
    )
  }

  return (
    <PelangganClient
      store={{
        id: store.id,
        name: store.name,
        // planTier(), bukan subscription_tier mentah: PRO yang masa aktifnya
        // sudah lewat dihitung GRATIS di seluruh aplikasi (temuan C9).
        plan: planTier(store).toLowerCase(),
        pelanggan_enabled: store.pelanggan_enabled ?? false,
        visit_threshold: store.visit_threshold ?? 5,
        discount_percent: store.discount_percent ?? 10,
      }}
    />
  )
}
