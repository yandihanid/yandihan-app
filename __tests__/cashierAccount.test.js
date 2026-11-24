import { describe, expect, it } from 'vitest'
import {
  normalizeUsername,
  validateUsername,
  validatePassword,
  USERNAME_PATTERN,
} from '@/lib/cashierAccount'

describe('cashierAccount helpers', () => {
  describe('normalizeUsername', () => {
    it('trims dan lowercase', () => {
      expect(normalizeUsername('  Budi.Seto  ')).toBe('budi.seto')
    })

    it('mengembalikan string kosong untuk input kosong', () => {
      expect(normalizeUsername('')).toBe('')
      expect(normalizeUsername(null)).toBe('')
      expect(normalizeUsername(undefined)).toBe('')
    })
  })

  describe('validateUsername', () => {
    it('terima username valid', () => {
      expect(validateUsername('budi')).toBeNull()
      expect(validateUsername('budi.seto_123')).toBeNull()
      expect(validateUsername('kasir-1')).toBeNull()
    })

    it('tolak kosong', () => {
      expect(validateUsername('')).toBe('Username wajib diisi')
    })

    it('tolak terlalu pendek', () => {
      expect(validateUsername('ab')).toBe('Username minimal 3 karakter')
    })

    it('tolak terlalu panjang', () => {
      expect(validateUsername('a'.repeat(33))).toBe('Username maksimal 32 karakter')
    })

    it('tolak huruf besar (karena normalisasi dulu, Budi menjadi budi yang valid)', () => {
      expect(validateUsername('Budi')).toBeNull()
    })

    it('tolak diawali simbol (titik dilarang di awal)', () => {
      expect(validateUsername('.budi')).toBe(
        'Username hanya boleh huruf kecil, angka, titik, garis bawah, atau tanda hubung',
      )
      expect(validateUsername('-budi')).toBe(
        'Username hanya boleh huruf kecil, angka, titik, garis bawah, atau tanda hubung',
      )
    })

    it('angka boleh di awal (cocok [a-z0-9])', () => {
      expect(validateUsername('1budi')).toBeNull()
    })

    it('USERNAME_PATTERN cocok dengan aturan', () => {
      expect(USERNAME_PATTERN.test('budi')).toBe(true)
      expect(USERNAME_PATTERN.test('1budi')).toBe(true)
      expect(USERNAME_PATTERN.test('budi.seto_123')).toBe(true)
      expect(USERNAME_PATTERN.test('Budi')).toBe(false) // huruf besar
      expect(USERNAME_PATTERN.test('.budi')).toBe(false) // diawali titik
      expect(USERNAME_PATTERN.test('budi seto')).toBe(false) // spasi
    })
  })

  describe('validatePassword', () => {
    it('terima password valid', () => {
      expect(validatePassword('rahasia123')).toBeNull()
    })

    it('tolak kosong (default required)', () => {
      expect(validatePassword('')).toBe('Kata sandi wajib diisi')
    })

    it('tolak terlalu pendek', () => {
      expect(validatePassword('abc')).toBe('Kata sandi minimal 6 karakter')
    })

    it('tolak terlalu panjang', () => {
      expect(validatePassword('a'.repeat(73))).toBe('Kata sandi maksimal 72 karakter')
    })

    it('boleh kosong saat required=false', () => {
      expect(validatePassword('', { required: false })).toBeNull()
    })
  })
})
