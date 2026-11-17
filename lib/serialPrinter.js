// Cetak struk thermal lewat Web Serial API.
//
// Digunakan untuk printer Bluetooth Classic (SPP/RFCOMM) — mis. printer EPSON
// 58mm — yang sudah di-pairing di Windows/Android dan muncul sebagai COM port
// (COM3, COM4, dst). Browser (Chrome/Edge) bisa mengakses port serial ini
// langsung tanpa aplikasi pendamping.
//
// Persyaratan:
//   1. Printer sudah di-pairing dengan komputer/HP via Bluetooth.
//   2. Di Windows, printer muncul sebagai port COM di Pengaturan → Bluetooth & perangkat → Lihat perangkat lain.
//   3. Browser Chrome/Edge (Web Serial tidak didukung Firefox/Safari).
//   4. Halaman harus dibuka lewat HTTPS atau localhost.

const ESC = 0x1b
const GS = 0x1d

function init() {
  return [ESC, 0x40] // inisialisasi printer
}

function line(text = '') {
  return [...new TextEncoder().encode(text), 0x0a]
}

function feed(n = 1) {
  return [ESC, 0x64, n]
}

function cut() {
  return [GS, 0x56, 0]
}

function align(n) {
  return [ESC, 0x61, n]
}

function bold(on) {
  return [ESC, 0x45, on ? 1 : 0]
}

function textSize(width, height) {
  const n = ((Math.min(Math.max(width, 1), 8) - 1) << 4) |
    (Math.min(Math.max(height, 1), 8) - 1)
  return [ESC, 0x21, n]
}

function underline(on) {
  return [ESC, 0x2d, on ? 1 : 0]
}

function buildEscPosBytes({
  storeName,
  address,
  phone,
  items = [],
  subtotal,
  discount = 0,
  total,
  paymentMethod,
  cashReceived,
  change,
  dateTime,
  cashierName,
  queueNumber,
  copy = false,
}) {
  const bytes = []

  bytes.push(...init())
  bytes.push(...align(1))
  bytes.push(...textSize(2, 2))
  bytes.push(...bold(true))
  bytes.push(...line(storeName || 'Toko'))
  bytes.push(...bold(false))
  bytes.push(...textSize(1, 1))
  if (address) bytes.push(...line(address))
  if (phone) bytes.push(...line(phone))
  bytes.push(...feed(1))
  bytes.push(...align(0))
  bytes.push(...line('----------------'))
  bytes.push(...line(dateTime || ''))
  if (cashierName) bytes.push(...line(`Kasir: ${cashierName}`))
  if (paymentMethod) bytes.push(...line(`Metode: ${paymentMethod}`))
  if (queueNumber != null) bytes.push(...line(`Antrean #${queueNumber}`))
  if (copy) {
    bytes.push(...underline(true))
    bytes.push(...line('COPY'))
    bytes.push(...underline(false))
  }
  bytes.push(...line('----------------'))

  for (const item of items) {
    const name = String(item.name ?? 'Item')
    const lineTotal = Number(item.line_total ?? 0)
    const qty = Number(item.qty ?? 1)
    const unitPrice = Number(item.unit_price ?? 0)
    bytes.push(...line(name))
    bytes.push(...line(`${qty} x ${formatRupiahInt(unitPrice)}  ${formatRupiahInt(lineTotal)}`))
  }

  bytes.push(...line('----------------'))
  bytes.push(...align(1))
  bytes.push(...line(`Subtotal:  ${formatRupiahInt(subtotal ?? 0)}`))
  if (discount && discount > 0) {
    bytes.push(...line(`Diskon:   -${formatRupiahInt(discount)}`))
  }
  bytes.push(...bold(true))
  bytes.push(...line(`Total:    ${formatRupiahInt(total ?? 0)}`))
  bytes.push(...bold(false))
  if (paymentMethod === 'CASH') {
    if (cashReceived != null) bytes.push(...line(`Diterima: ${formatRupiahInt(cashReceived)}`))
    if (change != null) bytes.push(...line(`Kembali:  ${formatRupiahInt(change)}`))
  }
  bytes.push(...feed(1))
  bytes.push(...line('Terima kasih!'))
  bytes.push(...feed(2))
  bytes.push(...cut())

  return new Uint8Array(bytes)
}

function formatRupiahInt(value) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`
}

/** Cek apakah Web Serial didukung. */
export function isSerialSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.serial)
}

/**
 * Buka port serial yang dipilih dan kirim data ESC/POS.
 * `port` adalah objek SerialPort dari navigator.serial.requestPort().
 * Baud rate default 9600 (umum untuk printer thermal).
 */
export async function printViaSerial(port, receipt, baudRate = 9600) {
  await port.open({ baudRate })

  const writer = port.writable.getWriter()
  try {
    const bytes = buildEscPosBytes(receipt)
    await writer.write(bytes)
  } finally {
    writer.releaseLock()
  }
  await port.close()
}

/**
 * Minta pengguna memilih port serial (Bluetooth Classic SPP yang sudah di-pairing).
 * Mengembalikan objek SerialPort kalau berhasil, atau null kalau dibatalkan.
 */
export async function selectSerialPort() {
  if (!isSerialSupported()) return null
  const port = await navigator.serial.requestPort()
  return port
}

/** Daftar port serial yang sudah pernah di-izinkan. */
export async function getSerialPorts() {
  if (!isSerialSupported()) return []
  return navigator.serial.getPorts()
}
