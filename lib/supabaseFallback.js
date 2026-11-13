import 'server-only'

/**
 * Query cadangan untuk SELECT yang kolomnya belum ada di database.
 *
 * PostgREST menolak SELURUH query kalau satu kolom yang diminta tidak ada.
 * Itu berarti satu migrasi yang belum dijalankan bisa membuat halaman yang
 * tidak ada hubungannya dengan migrasi itu ikut gagal — misalnya kolom
 * `logo_url` membuat seluruh struk terbaca sebagai "Struk Tidak Ditemukan".
 *
 * Aturan yang dipakai di repo ini:
 *
 *   - Alur yang dipakai pelanggan atau kasir (struk, halaman pesan meja,
 *     layar kasir) TIDAK BOLEH berhenti gara-gara migrasi belum dijalankan.
 *     Di sana query diulang tanpa kolom baru: fiturnya belum ada, tapi
 *     tokohnya tetap jalan.
 *   - Layar dashboard (pemilik toko) boleh gagal keras. Kegagalan itu
 *     justru tanda paling jelas bahwa migrasi belum dijalankan.
 *
 * @param {PromiseLike<{ data: unknown, error: unknown }>} query     query utama
 * @param {PromiseLike<{ data: unknown, error: unknown }>} fallback  query cadangan
 */
export async function withColumnFallback(query, fallback) {
  const result = await query
  if (!result.error) return result

  const backup = await fallback
  if (backup.error) return result
  return backup
}
