'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SwitchRow from '@/components/ui/SwitchRow'
import { useToast } from '@/components/ui/Toast'

/**
 * Satu setelan boolean toko.
 *
 * Menggantikan ToggleReceiptRequired.js dan ToggleStoreSettings.js — 68 baris
 * yang nyaris identik, berbeda hanya pada endpoint dan nama field. Keduanya
 * juga membawa sisa yang sama:
 *
 *   - `useEffect(..., [])` berisi hanya komentar "ensures component is mounted",
 *     sisa dari commit 3b77f4e. Efek tanpa isi tidak "memastikan" apa pun;
 *     komponen 'use client' memang selalu di-hydrate di browser.
 *   - <button> tanpa role/aria-checked/nama aksesibel: bagi pembaca layar itu
 *     tombol tanpa nama dan tanpa keadaan. Sekarang lewat Switch (role="switch").
 *   - alert('Gagal menyimpan') yang memblokir tab, sekarang toast.
 *
 * Yang paling penting: **state dikembalikan kalau server menolak.** Versi lama
 * memang hanya memanggil setIsOn() setelah res.ok, jadi tampilannya tidak
 * pernah bohong — tapi ia juga tidak pernah bergerak sampai jaringan menjawab,
 * yang terasa seperti tombol rusak. Di sini nilainya berpindah dulu (optimistik)
 * lalu dikembalikan kalau ternyata gagal, dan toast menjelaskan kenapa.
 *
 * Route-nya sendiri sekarang memastikan ada baris yang benar-benar cocok sebelum
 * menjawab sukses (lihat app/api/settings/store/route.js) — tanpa itu, tolakan
 * RLS terbaca sebagai berhasil dan toggle ini akan menampilkan keadaan yang
 * tidak ada di database.
 */
export default function SettingToggle({ storeId, field, title, description, initial }) {
  const [checked, setChecked] = useState(Boolean(initial))
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const toast = useToast()

  const handleChange = async (next) => {
    setChecked(next)
    setSaving(true)
    try {
      const res = await fetch('/api/settings/store', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, [field]: next }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Gagal menyimpan pengaturan')
      }
      // refresh() supaya nilai yang dibaca ulang di server (dan komponen lain
      // yang ikut memakainya) tidak tertinggal di keadaan lama.
      router.refresh()
    } catch (err) {
      setChecked(!next)
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SwitchRow
      id={`setting-${field}`}
      title={title}
      description={description}
      checked={checked}
      onChange={handleChange}
      busy={saving}
    />
  )
}
