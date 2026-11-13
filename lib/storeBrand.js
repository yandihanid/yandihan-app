// Validasi setelan logo & rating Google Maps.
//
// Dua setelan ini sama-sama diisi pemilik toko dari dashboard, jadi keduanya
// berakhir di kolom `text` dan nanti ditampilkan di halaman publik (struk dan
// halaman pesanan meja). Karena itu validasinya harus jelas di satu tempat:
// server action dan pesan error ke pengguna tidak boleh berbedaomid.
//
// Logo disimpan sebagai data URL hasil kompres di browser (pola yang sama
// dengan foto produk, jadi tidak butuh bucket Storage baru) ATAU sebagai URL
// http/https kalau pemiliknya sudah punya file yang di-host di luar.

/** Batas panjang data URL logo (~300 KB setelah base64). */
export const MAX_LOGO_LENGTH = 400_000

/** Batas panjang URL logo yang di-host di luar. */
export const MAX_LOGO_URL_LENGTH = 2_000

/** Batas panjang link rating Google Maps. */
export const MAX_REVIEW_URL_LENGTH = 500

/** Batas panjang catatan untuk pelanggan. */
export const MAX_REVIEW_NOTE_LENGTH = 300

const DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/

/**
 * Host yang dipakai tautan "Bagikan" dari Google Maps:
 *   - maps.google.com / www.google.com/maps/...  (link biasa)
 *   - g.page/...                                 (link singkat review)
 *   - goo.gl/maps/... , maps.app.goo.gl/...      (link pendek)
 * Host di luar daftar ini ditolak supaya link yang tidak sengaja tertempel
 * (mis. link IG atau WA) tidak pernah muncul di pop up rating.
 */
const GOOGLE_HOSTS = ['google.', 'maps.', 'goo.gl', 'g.page']

/**
 * Nilai logo dari form.
 *
 * String kosong berarti "hapus logo" -- jadi keluarannya `null`, bukan
 * string kosong, supaya kolom di database jadi NULL dan bukan '' yang nanti
 * ikut terbaca sebagai "logo ada".
 *
 * @returns {{ logoUrl: string | null, error: string | null }}
 */
export function parseLogoInput(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return { logoUrl: null, error: null }

  if (value.startsWith('data:')) {
    if (!DATA_URL_RE.test(value)) {
      return { logoUrl: null, error: 'Format logo tidak dikenali. Pakai file JPG, PNG, WEBP, atau GIF.' }
    }
    if (value.length > MAX_LOGO_LENGTH) {
      return { logoUrl: null, error: 'Ukuran logo terlalu besar. Maksimal sekitar 300 KB.' }
    }
    return { logoUrl: value, error: null }
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    if (value.length > MAX_LOGO_URL_LENGTH) {
      return { logoUrl: null, error: 'URL logo terlalu panjang (maks 2000 karakter)' }
    }
    return { logoUrl: value, error: null }
  }

  return { logoUrl: null, error: 'Logo harus berupa file gambar atau URL yang diawali http:// atau https://' }
}

/**
 * Link rating Google Maps.
 *
 * Kosong berarti fitur dimatikan: pop up rating tidak akan muncul untuk
 * pelanggan. Itu perilaku yang diminta pemilik toko, jadi tidak boleh
 * complains atau dianggap data tidak lengkap.
 *
 * @returns {{ url: string | null, error: string | null }}
 */
export function parseReviewUrl(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return { url: null, error: null }

  if (value.length > MAX_REVIEW_URL_LENGTH) {
    return { url: null, error: 'Link rating terlalu panjang (maks 500 karakter)' }
  }

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return { url: null, error: 'Link rating tidak valid. Salin link dari Google Maps lalu tempel di sini.' }
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { url: null, error: 'Link rating harus diawali http:// atau https://' }
  }

  const host = parsed.hostname.toLowerCase()
  if (!GOOGLE_HOSTS.some((needle) => host.includes(needle))) {
    return {
      url: null,
      error: 'Link rating harus link Google Maps, misalnya https://maps.app.goo.gl/...',
    }
  }

  return { url: parsed.toString(), error: null }
}

/**
 * Catatan untuk pelanggan (opsional).
 *
 * @returns {{ note: string | null, error: string | null }}
 */
export function parseReviewNote(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return { note: null, error: null }
  if (value.length > MAX_REVIEW_NOTE_LENGTH) {
    return { note: null, error: `Catatan terlalu panjang (maks ${MAX_REVIEW_NOTE_LENGTH} karakter)` }
  }
  return { note: value, error: null }
}
