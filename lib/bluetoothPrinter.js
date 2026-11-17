// Pencetakan struk thermal lewat Web Bluetooth API.
//
// Printer thermal Bluetooth biasanya mengekspos layanan GATT dengan satu
// karakteristik yang boleh ditulis (write). Aplikasi mengirim perintah ESC/POS
// (bahasa printer thermal standar) langsung ke karakteristik itu, jadi struk
// keluar tanpa melalui dialog cetak browser — yang sering tidak mendeteksi
// printer Bluetooth sama sekali (alasan pakai aplikasi pihak ketiga seperti
// rawbt dulu).
//
// Catatan: Web Bluetooth hanya mendukung BLE. Printer klasik (SPP/RFCOMM) tidak
// bisa diakses dari browser. Kalau perangkat tidak terdeteksi, pastikan printer
// dalam mode pairing/terjaring dan pakai browser yang mendukung Web Bluetooth
// (Chrome, Edge, Opera di Android/desktop).

const ESC = 0x1b
const GS = 0x1d

// Prefix kunci localStorage tempat ID perangkat printer yang dipilih disimpan
// per toko, sehingga pilihan tetap tersimpan meski halaman ditutup.
function deviceKey(storeId) {
  return `yandihan_bluetooth_printer_${storeId ?? 'default'}`
}

/** ID perangkat Bluetooth yang terakhir dipilih untuk toko ini. */
export function getStoredPrinterDeviceId(storeId) {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(deviceKey(storeId)) || null
  } catch {
    return null
  }
}

/** Simpan ID perangkat printer yang dipilih. */
export function setStoredPrinterDeviceId(storeId, deviceId) {
  if (typeof localStorage === 'undefined') return
  try {
    if (deviceId) localStorage.setItem(deviceKey(storeId), deviceId)
    else localStorage.removeItem(deviceKey(storeId))
  } catch {
    // Abaikan kalau penyimpanan penuh/diblokir.
  }
}

/** Hapus pilihan printer yang tersimpan. */
export function removeStoredPrinterDeviceId(storeId) {
  setStoredPrinterDeviceId(storeId, null)
}

// ──────────────────────────────────────────────────────────────
// Perintah ESC/POS
// ──────────────────────────────────────────────────────────────

function init() {
  return [ESC, 0x40] // ESC @ : inisialisasi printer
}

function line(text = '') {
  return [...new TextEncoder().encode(text), 0x0a] // teks + baris baru
}

function feed(n = 1) {
  return [ESC, 0x64, n] // ESC d n : avanceer n baris
}

function cut() {
  return [GS, 0x56, 0] // GS V 0 : potong kertas (full cut)
}

function align(n) {
  return [ESC, 0x61, n] // ESC a n : 0=kiri, 1=tengah, 2=kanan
}

function bold(on) {
  return [ESC, 0x45, on ? 1 : 0] // ESC E n : tebal
}

function textSize(width, height) {
  // ESC ! n : bit 0-2 tinggi (1-8), bit 3-5 lebar (1-8)
  const n = ((Math.min(Math.max(width, 1), 8) - 1) << 4) |
    (Math.min(Math.max(height, 1), 8) - 1)
  return [ESC, 0x21, n]
}

function underline(on) {
  return [ESC, 0x2d, on ? 1 : 0] // ESC - n : garis bawah
}

/** Bangun byte ESC/POS untuk struk thermal. */
export function buildReceiptEscPos({
  storeName,
  address,
  phone,
  themeColor,
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
  bytes.push(...align(1)) // tengah
  bytes.push(...textSize(2, 2)) // huruf besar 2x
  bytes.push(...bold(true))
  bytes.push(...line(storeName || 'Toko'))
  bytes.push(...bold(false))
  bytes.push(...textSize(1, 1))
  if (address) bytes.push(...line(address))
  if (phone) bytes.push(...line(phone))
  bytes.push(...feed(1))
  bytes.push(...align(0)) // kiri
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

// ──────────────────────────────────────────────────────────────
// Web Bluetooth
// ──────────────────────────────────────────────────────────────

const NOT_SUPPORTED = 'Web Bluetooth tidak didukung di browser ini.'

/** Cek apakah Web Bluetooth tersedia. */
export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth)
}

/**
 * Cari dan hubungkan printer Bluetooth.
 *
 * Mengembalikan { device, characteristic } kalau berhasil. Karena setiap merk
 * printer pakai service/karakteristik yang berbeda, fungsi ini menindaklanjuti
 * semua layanan dan memilih karakteristik pertama yang punya properti 'write'.
 */
export async function connectBluetoothPrinter() {
  if (!isBluetoothSupported()) {
    throw new Error(NOT_SUPPORTED)
  }

  let device
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [0xfff0], // layanan vendor umum printer thermal BLE
    })
  } catch (err) {
    if (err?.name === 'NotFoundError' || err?.name === 'NotAllowedError') {
      throw new Error('Printer tidak dipilih atau dibatalkan pengguna.')
    }
    throw err
  }

  if (!device) throw new Error('Printer tidak ditemukan.')

  const server = await device.gatt.connect()
  const services = await server.getPrimaryServices()

  for (const service of services) {
    try {
      const characteristics = await service.getCharacteristics()
      for (const ch of characteristics) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          return { device, server, characteristic: ch }
        }
      }
    } catch {
      // Lewati layanan yang tidak bisa dibaca.
    }
  }

  await server.disconnect()
  throw new Error('Karakteristik tulis tidak ditemukan pada printer ini.')
}

/**
 * Kirim byte ESC/POS ke printer yang sudah tersambung.
 * Data panjang dibagi-potong agar tidak melebihi MTU BLE (biasanya 20 byte).
 */
export async function writeToPrinter(characteristic, bytes) {
  const MAX_CHUNK = 20
  for (let i = 0; i < bytes.length; i += MAX_CHUNK) {
    const chunk = bytes.slice(i, i + MAX_CHUNK)
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk)
    } else {
      await characteristic.writeValue(chunk)
    }
  }
}

/**
 * Cetak struk ke printer Bluetooth.
 * `storeId` dipakai untuk menyimpan/memuat pilihan perangkat di localStorage.
 */
export async function printReceiptViaBluetooth({
  storeId,
  receipt,
  forceSelect = false,
}) {
  let deviceId = forceSelect ? null : getStoredPrinterDeviceId(storeId)
  let { characteristic, server, device } = null

  if (deviceId) {
    try {
      device = await navigator.bluetooth.getDevice({ id: deviceId })
      const server_ = await device.gatt.connect()
      const services = await server_.getPrimaryServices()
      let found = null
      for (const service of services) {
        const characteristics = await service.getCharacteristics()
        for (const ch of characteristics) {
          if (ch.properties.write || ch.properties.writeWithoutResponse) {
            found = { server: server_, characteristic: ch }
            break
          }
        }
        if (found) break
      }
      if (!found) throw new Error('Karakteristik tulis tidak ditemukan.')
      characteristic = found.characteristic
      server = found.server
    } catch {
      deviceId = null // Paksa pilih ulang.
    }
  }

  if (!characteristic) {
    const result = await connectBluetoothPrinter()
    characteristic = result.characteristic
    server = result.server
    device = result.device
    setStoredPrinterDeviceId(storeId, device.id)
  }

  const bytes = buildReceiptEscPos(receipt)
  await writeToPrinter(characteristic, bytes)

  // Jangan putuskan koneksi secara paksa agar mencetak berikutnya lebih cepat,
  // tapi simpan referensi server di properti hasil untuk pemanggil yang mau.
  return { ok: true, deviceId: device.id, deviceName: device.name, server }
}

/** Putuskan koneksi GATT jika pemanggil ingin membebaskan printer. */
export async function disconnectBluetoothPrinter(server) {
  if (server?.connected) server.disconnect()
}
