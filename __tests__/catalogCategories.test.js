import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CATEGORY,
  categoryOf,
  collectCategories,
  groupProductsByCategory,
  parseCategory,
} from '@/lib/catalog'

describe('kategori produk', () => {
  it('mengembalikan "Umum" untuk produk tanpa kategori', () => {
    expect(categoryOf({ id: 'a' })).toBe(DEFAULT_CATEGORY)
    expect(categoryOf({ id: 'a', category: '   ' })).toBe(DEFAULT_CATEGORY)
    expect(categoryOf({ id: 'a', category: 'Minuman' })).toBe('Minuman')
  })

  it('menerima kategori kosong sebagai "tanpa kategori"', () => {
    expect(parseCategory('')).toEqual({ category: null, error: null })
    expect(parseCategory(null)).toEqual({ category: null, error: null })
    expect(parseCategory('  Makanan  ')).toEqual({ category: 'Makanan', error: null })
  })

  it('menolak nama kategori yang terlalu panjang', () => {
    const result = parseCategory('x'.repeat(61))
    expect(result.category).toBeNull()
    expect(result.error).toMatch(/terlalu panjang/i)
  })

  it('mengelompokkan produk per kategori dan menaruh "Umum" di akhir', () => {
    const products = [
      { id: '1', name: 'Es Teh', category: 'Minuman' },
      { id: '2', name: 'Nasi Goreng', category: 'Makanan' },
      { id: '3', name: 'Kopi', category: 'Minuman' },
      { id: '4', name: 'Air Mineral' },
    ]

    const groups = groupProductsByCategory(products)

    expect(groups.map((group) => group.category)).toEqual(['Makanan', 'Minuman', 'Umum'])
    expect(groups[1].products.map((product) => product.id)).toEqual(['1', '3'])
    expect(groups[2].products.map((product) => product.id)).toEqual(['4'])
  })

  it('menggabungkan produk tanpa kategori dengan kategori "Umum"', () => {
    const groups = groupProductsByCategory([
      { id: '1', category: 'Umum' },
      { id: '2' },
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].category).toBe('Umum')
    expect(groups[0].products).toHaveLength(2)
  })

  it('mengumpulkan daftar kategori unik untuk pilihan cepat', () => {
    const categories = collectCategories([
      { category: 'Makanan' },
      { category: 'makanan' },
      { category: 'Minuman' },
      { category: '  ' },
      { category: null },
    ])

    expect(categories).toEqual(['Makanan', 'Minuman'])
  })
})
