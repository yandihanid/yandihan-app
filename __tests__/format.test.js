import { describe, expect, it } from 'vitest'
import { formatRupiah, normalizePhone, parseRupiah, shortTxNumber } from '@/lib/format'

describe('format helpers', () => {
  it('formats Rupiah and safely handles invalid values', () => {
    expect(formatRupiah(78000)).toBe('Rp 78.000')
    expect(formatRupiah(78000, { withSymbol: false })).toBe('78.000')
    expect(formatRupiah('not-a-number')).toBe('Rp 0')
  })

  it('parses common Rupiah input', () => {
    expect(parseRupiah('Rp 25.000')).toBe(25000)
    expect(parseRupiah('')).toBeNull()
    expect(parseRupiah('abc')).toBeNull()
  })

  it('creates a readable transaction number', () => {
    expect(shortTxNumber('123e4567-e89b-12d3-a456-426614174000')).toBe('123E4567')
    expect(shortTxNumber(null)).toBe('-')
  })

  it('normalizes Indonesian phone prefixes', () => {
    expect(normalizePhone('+62 812-3456-7890')).toBe('081234567890')
    expect(normalizePhone('8123456789')).toBe('08123456789')
  })

  it('accepts only 10 to 14 normalized digits', () => {
    expect(normalizePhone('0812345678')).toBe('0812345678')
    expect(normalizePhone('08123456789012')).toBe('08123456789012')
    expect(normalizePhone('081234567')).toBeNull()
    expect(normalizePhone('081234567890123')).toBeNull()
  })
})
