// Pengaturan cetak struk.
//
// Dua hal yang belum punya jawaban di aplikasi ini: lebar kertas yang dipakai
// printer thermal toko, dan apakah struk yang sedang dicetak perlu diberi
// label "COPY".

/** Lebar kertas yang didukung, dalam milimeter. */
export const RECEIPT_PRINTER_WIDTHS = [
  { id: '58', label: '58 mm', hint: 'Printer struk kecil (kartu POS, struk warung)' },
  { id: '80', label: '80 mm', hint: 'Printer struk besar (struk resto, minimarket)' },
]

const PRINTER_IDS = new Set(RECEIPT_PRINTER_WIDTHS.map((printer) => printer.id))

/**
 * Normalisasi lebar kertas dari database atau form.
 *
 * Default 58 mm: disappoint ini yang paling sering dipakai warung kecil, dan
 * struk 58 mm tetap muat di printer 80 mm (hanya lebih sempit di tengah).
 */
export function normalizeReceiptPrinter(value) {
  const id = String(value ?? '').trim()
  return PRINTER_IDS.has(id) ? id : '58'
}

/** Label lebar kertas untuk ditampilkan di pengaturan. */
export function receiptPrinterLabel(value) {
  const id = normalizeReceiptPrinter(value)
  return RECEIPT_PRINTER_WIDTHS.find((printer) => printer.id === id)?.label ?? id
}

/**
 * Apakah struk ini harus diberi label "COPY"?
 *
 * Aturannya mengikuti cara kerja kasir:
 *
 *   - Pesanan On the Table: pelanggan membayar sendiri di HP-nya, jadi
 *     struk BELUM pernah keluar dari printer. Cetak pertama dari menu Antrean
 *     masih struk asli; cetak kedua dan seterusnya adalah salinan.
 *
 *   - Transaksi langsung di link kasir: begitu transaksi berhasil, kasir
 *     langsung diarahkan ke halaman struk dan struk asli sudah diberikan ke
 *     pembeli. Jadi cetakan berikutnya SELALU salinan.
 *
 * @param {{ tableNumber?: number | null, printCount?: number | null }} params
 * @returns {boolean}
 */
export function isCopyReceipt({ tableNumber = null, printCount = null } = {}) {
  const fromTable = tableNumber !== null && tableNumber !== undefined
  if (fromTable) return Number(printCount ?? 0) > 1
  return true
}
