import { describe, expect, it } from 'vitest'
import {
  isCopyReceipt,
  normalizeReceiptPrinter,
  receiptPrinterLabel,
} from '@/lib/receiptPrinter'
import { DEFAULT_THEME, STORE_THEMES, normalizeTheme, themeLabel } from '@/lib/storeTheme'

describe('lebar kertas struk', () => {
  it('menerima 58 dan 80, sisanya jatuh ke bawaan', () => {
    expect(normalizeReceiptPrinter('58')).toBe('58')
    expect(normalizeReceiptPrinter('80')).toBe('80')
    expect(normalizeReceiptPrinter('a4')).toBe('58')
    expect(normalizeReceiptPrinter(null)).toBe('58')
  })

  it('menyimpan label yang bisa dibaca', () => {
    expect(receiptPrinterLabel('80')).toBe('80 mm')
    expect(receiptPrinterLabel('58')).toBe('58 mm')
  })
})

describe('label COPY pada struk', () => {
  it('pesanan On the Table: cetak pertama asli, berikutnya COPY', () => {
    expect(isCopyReceipt({ tableNumber: 3, printCount: 1 })).toBe(false)
    expect(isCopyReceipt({ tableNumber: 3, printCount: 2 })).toBe(true)
    expect(isCopyReceipt({ tableNumber: 3, printCount: 5 })).toBe(true)
  })

  it('transaksi langsung: struk asli sudah diberikan, jadi selalu COPY', () => {
    expect(isCopyReceipt({ tableNumber: null, printCount: 1 })).toBe(true)
    expect(isCopyReceipt({ tableNumber: undefined, printCount: 3 })).toBe(true)
  })

  it('menangani data yang belum lengkap', () => {
    expect(isCopyReceipt({})).toBe(true)
    expect(isCopyReceipt()).toBe(true)
  })
})

describe('warna toko', () => {
  it('menerima hanya warna yang ada di daftar', () => {
    for (const theme of STORE_THEMES) {
      expect(normalizeTheme(theme.id)).toBe(theme.id)
      expect(normalizeTheme(theme.id.toUpperCase())).toBe(theme.id)
    }
  })

  it('jatuh ke warna bawaan untuk nilai asing', () => {
    expect(normalizeTheme('nilaiku')).toBe(DEFAULT_THEME)
    expect(normalizeTheme(null)).toBe(DEFAULT_THEME)
    expect(normalizeTheme('')).toBe(DEFAULT_THEME)
  })

  it('menyimpan label warna', () => {
    expect(themeLabel('green')).toBe('Hijau')
    expect(themeLabel('tidak-ada')).toBe('Biru')
  })
})
