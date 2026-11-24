import { describe, expect, it } from 'vitest'
import { normalizeTheme, themeLabel, STORE_THEMES, DEFAULT_THEME } from '@/lib/storeTheme'

describe('storeTheme helpers', () => {
  it('DEFAULT_THEME adalah blue', () => {
    expect(DEFAULT_THEME).toBe('blue')
  })

  it('STORE_THEMES tidak kosong dan punya id unik', () => {
    expect(STORE_THEMES.length).toBeGreaterThan(0)
    const ids = STORE_THEMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  describe('normalizeTheme', () => {
    it('mengembalikan tema valid apa adanya', () => {
      expect(normalizeTheme('red')).toBe('red')
      expect(normalizeTheme('green')).toBe('green')
    })

    it('case-insensitive', () => {
      expect(normalizeTheme('RED')).toBe('red')
      expect(normalizeTheme(' Blue ')).toBe('blue')
    })

    it('nilai tidak dikenal jatuh ke default', () => {
      expect(normalizeTheme('neon')).toBe('blue')
      expect(normalizeTheme(null)).toBe('blue')
      expect(normalizeTheme(undefined)).toBe('blue')
      expect(normalizeTheme('')).toBe('blue')
    })
  })

  describe('themeLabel', () => {
    it('mengembalikan label Indonesia', () => {
      expect(themeLabel('red')).toBe('Merah')
      expect(themeLabel('blue')).toBe('Biru')
    })

    it('nilai tidak dikenal dikembalikan label default (blue -> Biru)', () => {
      expect(themeLabel('tidak-ada')).toBe('Biru')
      expect(themeLabel(null)).toBe('Biru')
    })
  })
})
