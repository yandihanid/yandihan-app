export const PRODUCT_TYPES = new Set(['main', 'sub'])

/**
 * Kategori default untuk produk tanpa kategori.
 *
 * Produk lama (dan produk yang pemiliknya belum mengisi kategori)
 * dikelompokkan di sini supaya menu tidak pernah punya produk yang
 * "menghilang".
 */
export const DEFAULT_CATEGORY = 'Umum'

/**
 * Klasifikasi produk utama / sub-produk.
 *
 * SUDAH TIDAK DIPAKAI DI UI: dikategorikan menu, jadi klasifikasi ini
 * diganti kategori (lihat categoryOf di bawah). Dua helper ini tetap ada
 * karena kolom `products.is_sub_product` masih ada di database dan masih
 * divalidasi oleh trigger transaksi -- cara membaca kolom itu harus tetap
 * punya satu tempat.
 */
export function parseProductType(value) {
  const type = String(value || '').trim().toLowerCase()
  return PRODUCT_TYPES.has(type) ? type : null
}

export function splitProducts(products = []) {
  const main = []
  const sub = []
  for (const product of products) {
    if (product?.is_sub_product === true) sub.push(product)
    else main.push(product)
  }
  return { main, sub }
}

/**
 * Nama kategori sebuah produk.
 *
 * String kosong, null, atau whitespace semuanya berarti "tidak ada kategori"
 * dan jatuh ke DEFAULT_CATEGORY. Nama kategori yang ditulis pemilik disimpan
 * apa adanya (tanpa trimmed-case) supaya tampilan di layar kasir sama dengan
 * yang diketik pemilik.
 */
export function categoryOf(product) {
  const raw = String(product?.category ?? '').trim()
  return raw || DEFAULT_CATEGORY
}

/**
 * Normalisasi input kategori dari form.
 *
 * Mengembalikan null kalau kosong (produk tanpa kategori) dan error kalau
 * nama kategorinya tidak masuk akal -- kategori dipakai sebagai label di
 * beberapa halaman, jadi panjangnya dibatasi.
 */
export function parseCategory(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return { category: null, error: null }
  if (value.length > 60) {
    return { category: null, error: 'Nama kategori terlalu panjang (maks 60 karakter)' }
  }
  return { category: value, error: null }
}

/**
 * Kelompokkan produk berdasarkan kategori.
 *
 * Urutannya: kategori yang isinya produk tampil lebih dulu, lalu "Umum" di
 * akhir supaya kategori yang baru diisi tidak menggeser menu yang sudah rapi.
 * Di dalam kelompok, urutan produk mengikuti urutan masukannya (nama produk
 * sudah diurutkan oleh server).
 *
 * @param {Array} products
 * @returns {Array<{ category: string, products: Array }>}
 */
export function groupProductsByCategory(products = []) {
  const groups = new Map()

  for (const product of products) {
    const category = categoryOf(product)
    if (!groups.has(category)) groups.set(category, [])
    groups.get(category).push(product)
  }

  return [...groups.entries()]
    .map(([category, items]) => ({ category, products: items }))
    .sort((a, b) => {
      if (a.category === DEFAULT_CATEGORY) return 1
      if (b.category === DEFAULT_CATEGORY) return -1
      return a.category.localeCompare(b.category, 'id')
    })
}

/**
 * Daftar kategori yang dipakai toko, untuk mengisi pilihan kategori.
 *
 * Diambil dari produk yang ada, jadi tidak perlu tabel kategori tersendiri:
 * kategori yang belum dipakai produk mana pun tidak berguna dan tidak
 * ditampilkan.
 */
export function collectCategories(products = []) {
  const seen = new Map()
  for (const product of products) {
    const raw = String(product?.category ?? '').trim()
    if (!raw) continue
    if (!seen.has(raw.toLowerCase())) seen.set(raw.toLowerCase(), raw)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'id'))
}
