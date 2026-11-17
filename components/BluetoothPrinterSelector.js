'use client'

import { useCallback, useState } from 'react'
import { Bluetooth, Printer, RefreshCw, X, HardDrive } from 'lucide-react'
import {
  isBluetoothSupported,
  connectBluetoothPrinter,
  writeToPrinter,
  buildReceiptEscPos,
  getStoredPrinterDeviceId,
  setStoredPrinterDeviceId,
  disconnectBluetoothPrinter,
} from '@/lib/bluetoothPrinter'
import {
  isSerialSupported,
  selectSerialPort as pickSerialPort,
  getSerialPorts,
  printViaSerial as writeSerial,
} from '@/lib/serialPrinter'
import { useToast } from '@/components/ui/Toast'

/**
 * Pemilih printer struk thermal.
 *
 * Dua mode cetak langsung ke printer (tanpa dialog browser):
 *
 *  1. Bluetooth BLE (Web Bluetooth API) — untuk printer BLE modern.
 *  2. Serial/COM (Web Serial API) — untuk printer Bluetooth Classic (SPP/RFCOM)
 *     mis. EPSON 58mm yang sudah di-pairing di Windows dan muncul sebagai COM port.
 *
 * Dipakai di halaman struk (/r/[id]) dan menu Antrean/Kasir. Pilihan disimpan
 * di localStorage per toko.
 */
export default function BluetoothPrinterSelector({
  storeId,
  receipt,
  onPrinted,
  className = '',
}) {
  const { show, error: toastError } = useToast()
  const [selecting, setSelecting] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [scanStatus, setScanStatus] = useState('')
  const [bleDeviceId, setBleDeviceId] = useState(() =>
    getStoredPrinterDeviceId(storeId),
  )
  const [serialPortId, setSerialPortId] = useState(() => {
    if (typeof localStorage === 'undefined') return null
    try {
      return localStorage.getItem(`yandihan_serial_port_${storeId ?? 'default'}`) || null
    } catch {
      return null
    }
  })

  const hasBleDevice = Boolean(bleDeviceId)
  const hasSerialPort = Boolean(serialPortId)
  const canPrint = Boolean(receipt && (hasBleDevice || hasSerialPort))

  /* ── Bluetooth BLE ── */

  const selectBlePrinter = useCallback(async () => {
    if (!isBluetoothSupported()) {
      toastError(
        'Web Bluetooth tidak didukung browser ini. Pakai Chrome/Edge.',
      )
      return
    }
    setSelecting(true)
    setScanStatus('Mencari printer Bluetooth...')
    try {
      const result = await connectBluetoothPrinter()
      setBleDeviceId(result.device.id)
      setStoredPrinterDeviceId(storeId, result.device.id)
      setScanStatus(`Terhubung BLE: ${result.deviceName || result.deviceId}`)
      show(`Printer BLE terhubung: ${result.deviceName || result.deviceId}`)
    } catch (err) {
      setScanStatus('')
      toastError(err?.message || 'Gagal terhubung ke printer Bluetooth BLE.')
    } finally {
      setSelecting(false)
    }
  }, [storeId, show, toastError])

  const printViaBle = useCallback(async () => {
    if (!bleDeviceId) {
      await selectBlePrinter()
      if (!bleDeviceId) return
    }
    if (!receipt) {
      toastError('Data struk tidak tersedia untuk dicetak.')
      return
    }
    setPrinting(true)
    let server = null
    try {
      const device = await navigator.bluetooth.getDevice({ id: bleDeviceId })
      if (device.gatt.connected !== true) await device.gatt.connect()

      const services = await device.gatt.getPrimaryServices()
      let characteristic = null
      for (const service of services) {
        const characteristics = await service.getCharacteristics()
        for (const ch of characteristics) {
          if (ch.properties.write || ch.properties.writeWithoutResponse) {
            characteristic = ch
            server = device.gatt
            break
          }
        }
        if (characteristic) break
      }
      if (!characteristic) {
        throw new Error('Karakteristik tulis tidak ditemukan pada printer.')
      }

      const bytes = buildReceiptEscPos(receipt)
      await writeToPrinter(characteristic, bytes)
      show('Struk berhasil dicetak ke printer Bluetooth BLE.')
      onPrinted?.()
    } catch (err) {
      toastError(err?.message || 'Gagal mencetak struk lewat Bluetooth BLE.')
    } finally {
      if (server) disconnectBluetoothPrinter(server)
      setPrinting(false)
    }
  }, [bleDeviceId, receipt, selectBlePrinter, show, toastError, onPrinted])

  const disconnectBle = useCallback(() => {
    setBleDeviceId(null)
    setStoredPrinterDeviceId(storeId, null)
    setScanStatus('')
  }, [storeId])

  /* ── Serial / COM (Bluetooth Classic SPP/RFCOM) ── */

  const selectSerialPort = useCallback(async () => {
    if (!isSerialSupported()) {
      toastError(
        'Web Serial tidak didukung browser ini. Pakai Chrome/Edge.',
      )
      return
    }
    setSelecting(true)
    setScanStatus('Memilih port COM...')
    try {
      const port = await pickSerialPort()
      if (!port) {
        setScanStatus('')
        return
      }
      // Simpan informasi port untuk dipakai ulang (getPorts memerlukan izin ulang
      // setelah reload di sebagian browser, tapi coba simpan dulu).
      setSerialPortId(port?.usbProductId ?? port?.portId ?? String(Date.now()))
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(
            `yandihan_serial_port_${storeId ?? 'default'}`,
            String(port?.usbProductId ?? port?.portId ?? Date.now()),
          )
        }
      } catch {}
      setScanStatus(`Port COM dipilih: ${port?.usbProductId ?? 'port serial'}`)
      show('Port COM (Bluetooth Classic) dipilih.')
    } catch (err) {
      setScanStatus('')
      toastError(err?.message || 'Gagal memilih port COM.')
    } finally {
      setSelecting(false)
    }
  }, [storeId, show, toastError])

  const printViaSerial = useCallback(async () => {
    if (!serialPortId) {
      await selectSerialPort()
      if (!serialPortId) return
    }
    if (!receipt) {
      toastError('Data struk tidak tersedia untuk dicetak.')
      return
    }

    // Web Serial: port harus diminta ulang via requestPort di sebagian browser.
    // Coba ambil port yang sudah diizinkan, kalau tidak ada minta ulang.
    let port = null
    try {
      const ports = await getSerialPorts()
      port = ports[0]
    } catch {
      port = null
    }
    if (!port) {
      await selectSerialPort()
      // setelah requestPort, coba ambil lagi
      try {
        const ports2 = await getSerialPorts()
        port = ports2[0]
      } catch {
        port = null
      }
    }
    if (!port) {
      toastError('Tidak ada port COM yang tersedia. Pilih ulang port.')
      return
    }

    setPrinting(true)
    try {
      await writeSerial(port, receipt)
      show('Struk berhasil dicetak ke printer Serial/COM (Bluetooth Classic).')
      onPrinted?.()
    } catch (err) {
      toastError(err?.message || 'Gagal mencetak struk lewat port COM.')
    } finally {
      setPrinting(false)
    }
  }, [serialPortId, receipt, show, toastError, onPrinted])

  const disconnectSerial = useCallback(() => {
    setSerialPortId(null)
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`yandihan_serial_port_${storeId ?? 'default'}`)
      }
    } catch {}
  }, [storeId])

  const noBrowserSupport = !isBluetoothSupported() && !isSerialSupported()

  if (noBrowserSupport) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${className}`}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Cetak printer langsung tidak didukung browser ini. Pakai Chrome/Edge.
        </span>
      </div>
    )
  }

  return (
    <div
      className={`inline-flex flex-col sm:flex-row sm:items-center gap-2 ${className}`}
    >
      {scanStatus && (
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginBottom: '0.25rem',
            display: 'block',
          }}
        >
          {scanStatus}
        </span>
      )}

      {/* Tombol pilih/cetak Serial (Bluetooth Classic SPP/RFCOM) — prioritas utama
         untuk printer EPSON classic. */}
      {isSerialSupported() && (
        <>
          {hasSerialPort ? (
            <>
              <button
                type="button"
                disabled={printing || !canPrint}
                onClick={printViaSerial}
                className="btn btn-primary btn-sm"
                style={{ minHeight: 'auto', padding: '0.5rem 1rem' }}
              >
                {printing ? 'Mencetak...' : (
                  <>
                    <HardDrive size={14} aria-hidden="true" />
                    Cetak via COM (Bluetooth Classic)
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={disconnectSerial}
                className="btn btn-ghost btn-sm"
                style={{ minHeight: 'auto', padding: '0.5rem 1rem' }}
              >
                <X size={14} aria-hidden="true" />
                Putuskan COM
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={selecting}
              onClick={selectSerialPort}
              className="btn btn-secondary btn-sm"
              style={{ minHeight: 'auto', padding: '0.5rem 1rem' }}
            >
              {selecting ? 'Memilih port...' : (
                <>
                  <HardDrive size={14} aria-hidden="true" />
                  Pilih Port COM (Bluetooth Classic)
                </>
              )}
            </button>
          )}
        </>
      )}

      {/* Tombol pilih/cetak Bluetooth BLE (opsional, untuk printer BLE modern) */}
      {isBluetoothSupported() && (
        <>
          {hasBleDevice ? (
            <>
              {canPrint && !hasSerialPort ? (
                <button
                  type="button"
                  disabled={printing}
                  onClick={printViaBle}
                  className="btn btn-primary btn-sm"
                  style={{ minHeight: 'auto', padding: '0.5rem 1rem' }}
                >
                  {printing ? 'Mencetak...' : (
                    <>
                      <Bluetooth size={14} aria-hidden="true" />
                      Cetak via Bluetooth BLE
                    </>
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={disconnectBle}
                className="btn btn-ghost btn-sm"
                style={{ minHeight: 'auto', padding: '0.5rem 1rem' }}
              >
                <X size={14} aria-hidden="true" />
                Putuskan BLE
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={selecting}
              onClick={selectBlePrinter}
              className="btn btn-secondary btn-sm"
              style={{ minHeight: 'auto', padding: '0.5rem 1rem' }}
            >
              {selecting ? 'Mencari...' : (
                <>
                  <Bluetooth size={14} aria-hidden="true" />
                  Pilih Printer BLE
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  )
}
