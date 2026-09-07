import { CheckCircle2, Circle, Lock, Package, Send, Store, UserPlus } from 'lucide-react'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import Button from '@/components/ui/Button'

/**
 * Onboarding berpemandu untuk toko yang belum jalan (temuan K5).
 *
 * Yang digantikan: `/dashboard` dulu memanggil redirect('/dashboard/settings')
 * begitu getMyStore() mengembalikan null. Pengguna baru yang baru selesai
 * memverifikasi email jadi terlempar ke halaman pengaturan penuh field tanpa
 * satu kalimat pun yang menjelaskan kenapa, lalu setelah menyimpan nama toko ia
 * kembali ke dashboard kosong tanpa tahu langkah berikutnya. Empat langkah di
 * bawah ini adalah urutan minimum sampai transaksi pertama masuk.
 *
 * Kenapa Server Component: keempat status dihitung dari data yang sudah diambil
 * pemanggil di server pass yang sama (getMyStore + tiga count query), jadi tidak
 * ada satu pun fetch dari browser dan tidak ada layar "memuat...".
 *
 * Langkah dikunci berurutan — tombol hanya muncul di langkah aktif. Menampilkan
 * "Tambah Kasir" saat tokonya belum ada berarti mengirim orang ke tombol yang
 * pasti gagal.
 */

const STEP_ICONS = [Store, Package, UserPlus, Send]

/** Pesan WhatsApp untuk langkah keempat. Dibangun di server supaya tautannya
 *  ikut ter-render tanpa JavaScript; wa.me bekerja di ponsel maupun desktop. */
function waShareHref(link) {
  const text = `Halo, ini link kasir ${SITE_NAME} untuk toko kita. Buka di HP, tidak perlu install aplikasi:\n\n${link}\n\nSimpan link-nya, jangan dibagikan ke orang lain.`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export default function OnboardingChecklist({
  store,
  productCount = 0,
  cashierCount = 0,
  transactionCount = 0,
  cashierToken = null,
}) {
  const cashierLink = cashierToken ? `${SITE_URL}/c/${cashierToken}` : null

  const steps = [
    {
      title: 'Buat toko',
      desc: 'Nama toko muncul di struk dan di layar kasir.',
      done: Boolean(store),
      cta: { label: 'Buat Toko', href: '/dashboard/settings' },
    },
    {
      title: 'Tambah produk',
      desc: 'Minimal satu produk supaya kasir punya sesuatu untuk dijual.',
      done: productCount > 0,
      cta: { label: 'Tambah Produk', href: '/dashboard/produk' },
    },
    {
      title: 'Tambah kasir',
      desc: 'Setiap kasir dapat link sendiri. Paket GRATIS: 1 slot kasir.',
      done: cashierCount > 0,
      cta: { label: 'Tambah Kasir', href: '/dashboard/settings' },
    },
    {
      title: 'Bagikan link kasir',
      desc: cashierLink
        ? 'Kirim link ke HP kasir. Transaksi pertama akan langsung muncul di sini.'
        : 'Tersedia setelah kasir dibuat.',
      done: transactionCount > 0,
      cta: cashierLink
        ? { label: 'Bagikan via WhatsApp', href: waShareHref(cashierLink), external: true }
        : null,
    },
  ]

  // Langkah aktif = yang pertama belum selesai. Kalau semuanya selesai,
  // komponen ini tidak dirender lagi oleh pemanggil.
  const activeIndex = steps.findIndex((s) => !s.done)
  const doneCount = steps.filter((s) => s.done).length

  return (
    <section className="card onb" aria-labelledby="onb-title">
      <div className="onb-head">
        <h2 id="onb-title">Siapkan toko Anda</h2>
        <p>
          {doneCount === 0
            ? 'Empat langkah singkat sampai transaksi pertama masuk.'
            : `${doneCount} dari ${steps.length} langkah selesai. Lanjut ke langkah berikutnya.`}
        </p>
      </div>

      {/* Progres juga disampaikan sebagai teks di atas, jadi bar-nya cukup
          dekoratif dan tidak perlu dibacakan dua kali. */}
      <div
        className="onb-progress"
        role="presentation"
        style={{ '--onb-progress': `${(doneCount / steps.length) * 100}%` }}
      />

      <ol className="onb-list">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[i]
          const isActive = i === activeIndex
          const isLocked = !step.done && !isActive
          const state = step.done ? 'done' : isActive ? 'active' : 'locked'

          return (
            <li key={step.title} className="onb-item" data-state={state}>
              <span className="onb-mark" aria-hidden="true">
                {step.done ? <CheckCircle2 size={22} /> : isLocked ? <Lock size={18} /> : <Circle size={22} />}
              </span>

              <div className="onb-body">
                <strong className="onb-item-title">
                  <Icon size={16} aria-hidden="true" />
                  {step.title}
                  <span className="sr-only">
                    {step.done ? ' (selesai)' : isActive ? ' (langkah saat ini)' : ' (belum bisa dikerjakan)'}
                  </span>
                </strong>
                <p className="onb-item-desc">{step.desc}</p>

                {isActive && step.cta && (
                  <Button
                    href={step.cta.href}
                    size="sm"
                    className="onb-cta"
                    {...(step.cta.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {step.cta.label}
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {cashierLink && (
        <p className="onb-foot">
          Link kasir Anda: <code>{cashierLink}</code>
        </p>
      )}
    </section>
  )
}
