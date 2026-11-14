// Preferensi warna toko.
//
// Warna dasar aplikasi dipakai di SEMUA halaman: dashboard pemilik, link kasir
// (/c/<token>), dan halaman pesan meja (/t/<store>/<meja>). Dulu nilainya
// ditulis mati di :root (app/globals.css) sebagai biru, jadi toko yang
// branding-nya merah tetap menampilkan tombol biru.
//
// Sekarang pemilik memilih sendiri lewat Dashboard -> Pengaturan. Nilainya
// disimpan di kolom `stores.theme_color` dan diteruskan ke halaman lewat
// atribut `data-store-theme`, yang dipetakan ke variabel CSS di globals.css.
//
// Daftar warna di sini adalah satu-satunya sumber kebenaran: nilai yang tidak
// dikenal jatuh ke tema bawaan, jadi kolom database yang berisi sampah tidak
// bisa membuat halaman tanpa warna sama sekali.

export const DEFAULT_THEME = 'blue'

export const STORE_THEMES = [
  { id: 'blue', label: 'Biru', swatch: '#2563EB' },
  { id: 'green', label: 'Hijau', swatch: '#15803D' },
  { id: 'red', label: 'Merah', swatch: '#B91C1C' },
  { id: 'orange', label: 'Jingga', swatch: '#C2410C' },
  { id: 'purple', label: 'Ungu', swatch: '#6D28D9' },
  { id: 'teal', label: 'Toska', swatch: '#0F766E' },
  { id: 'pink', label: 'Merah Muda', swatch: '#BE185D' },
  { id: 'slate', label: 'Abu-abu', swatch: '#334155' },
]

const THEME_IDS = new Set(STORE_THEMES.map((theme) => theme.id))

/**
 * Normalisasi nilai tema dari database atau form.
 *
 * Nilai yang tidak dikenal (mis. kolom masih NULL, atau nilai lama yang
 * dihapus) jatuh ke tema bawaan -- halaman tetap punya warna, tidak pernah
 * uncolored.
 */
export function normalizeTheme(value) {
  const id = String(value ?? '').trim().toLowerCase()
  return THEME_IDS.has(id) ? id : DEFAULT_THEME
}

/** Label tema untuk ditampilkan di pengaturan. */
export function themeLabel(value) {
  const id = normalizeTheme(value)
  return STORE_THEMES.find((theme) => theme.id === id)?.label ?? id
}
