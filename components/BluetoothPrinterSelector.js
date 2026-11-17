'use client'

import { useCallback, useState } from 'react'
import { Bluetooth, Printer, RefreshCw, X } from 'lucide-react'
import {
  isBluetoothSupported,
  connectBluetoothPrinter,
  writeToPrinter,
  buildReceiptEscPos,
  getStoredPrinterDeviceId,
  setStoredPrinterDeviceId,
  disconnectBluetoothPrinter,
} from '@/lib/bluetoothPrinter'
import { useToast } from '@/components/ui/Toast'

/**
 * Pemilih printer Bluetooth untuk cetak struk thermal.
 *
 * Dipakai di halaman struk (/r/[id]) dan menu Antrean/Kasir. Setelah perangkat
 * dipilih sekali, ID-nya disimpan di localStorage per toko dan tidak perlu
 * dipilih lagi di sesi berikutnya.
 *
 * Koneksi GATT dibuka ulang setiap kali mencetak (tidak disimpan di ref), supaya
 * tidak ada mutasi ref di dalam event handler yang bisa menyebabkan peringatan
 * ESLint react-hooks/immutability.
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
  const [connectedDeviceId, setConnectedDeviceId] = useState(() =>
    getStoredPrinterDeviceId(storeId),
  )

  const hasDevice = Boolean(connectedDeviceId)
  const canPrint = Boolean(hasDevice && receipt)

  const selectPrinter = useCallback(async () => {
    if (!isBluetoothSupported()) {
      toastError(
        'Web Bluetooth tidak didukung browser ini. Pakai Chrome/Edge atau cetak lewat browser.',
      )
      return
    }
    setSelecting(true)
    try {
      const result = await connectBluetoothPrinter()
      setConnectedDeviceId(result.device.id)
      setStoredPrinterDeviceId(storeId, result.device.id)
      show(`Printer terhubung: ${result.deviceName || result.deviceId}`)
    } catch (err) {
      toastError(err?.message || 'Gagal terhubung ke printer Bluetooth.')
    } finally {
      setSelecting(false)
    }
  }, [storeId, show, toastError])

  /** Buka koneksi GATT ke perangkat yang sudah tersimpan dan cari karakteristik tulis. */
  const openPrinterChannel = useCallback(async () => {
    const device = await navigator.bluetooth.getDevice({ id: connectedDeviceId })
    if (device.gatt.connected !== true) await device.gatt.connect()

    const services = await device.gatt.getPrimaryServices()
    for (const service of services) {
      const characteristics = await service.getCharacteristics()
      for (const ch of characteristics) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          return { server: device.gatt, characteristic: ch }
        }
      }
    }
    throw new Error('Karakteristik tulis tidak ditemukan pada printer.')
  }, [connectedDeviceId])

  const printNow = useCallback(async () => {
    if (!connectedDeviceId) {
      await selectPrinter()
      if (!connectedDeviceId) return
    }
    if (!receipt) {
      toastError('Data struk tidak tersedia untuk dicetak.')
      return
    }
    setPrinting(true)
    let server = null
    try {
      const { server: srv, characteristic } = await openPrinterChannel()
      server = srv

      const bytes = buildReceiptEscPos(receipt)
      await writeToPrinter(characteristic, bytes)
      show('Struk berhasil dicetak ke printer Bluetooth.')
      onPrinted?.()
    } catch (err) {
      toastError(err?.message || 'Gagal mencetak struk lewat Bluetooth.')
    } finally {
      if (server) disconnectBluetoothPrinter(server)
      setPrinting(false)
    }
  }, [
    connectedDeviceId,
    receipt,
    selectPrinter,
    openPrinterChannel,
    show,
    toastError,
    onPrinted,
  ])

  const disconnect = useCallback(() => {
    setConnectedDeviceId(null)
    setStoredPrinterDeviceId(storeId, null)
  }, [storeId])

  if (!isBluetoothSupported()) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${className}`}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Cetak Bluetooth tidak didukung browser ini
        </span>
      </div>
    )
  }

  return (
    <div
      className={`inline-flex flex-col sm:flex-row sm:items-center gap-2 ${className}`}
    >
      {hasDevice ? (
        <>
          {canPrint ? (
            <button
              type="button"
              disabled={printing}
              onClick={printNow}
              className="btn btn-primary btn-sm"
              style={{ minHeight: 'auto', padding: '0.5rem 1rem' }}
            >
              {printing ? 'Mencetak...' : (
                <>
                  <Printer size={14} aria-hidden="true" />
                  Cetak via Bluetooth
                </>
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={disconnect}
            className="btn btn-ghost btn-sm"
            style={{ minHeight: 'auto', padding: '0.5rem 1rem' }}
          >
            <X size={14} aria-hidden="true" />
            Putuskan
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={selecting}
          onClick={selectPrinter}
          className="btn btn-secondary btn-sm"
          style={{ minHeight: 'auto', padding: '0.5rem 1rem' }}
        >
          {selecting ? 'Mencari printer...' : (
            <>
              <Bluetooth size={14} aria-hidden="true" />
              Pilih Printer Bluetooth
            </>
          )}
        </button>
      )}
    </div>
  )
}
