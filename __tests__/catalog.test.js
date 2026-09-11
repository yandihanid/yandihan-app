import { describe, expect, it } from 'vitest'
import { parseProductType, splitProducts } from '@/lib/catalog'

describe('catalog helpers', () => {
  it('accepts only the public product type enum', () => {
    expect(parseProductType(' MAIN ')).toBe('main')
    expect(parseProductType('sub')).toBe('sub')
    expect(parseProductType('addon')).toBeNull()
  })

  it('splits catalog rows and treats legacy rows as main products', () => {
    const products = [
      { id: 'main', is_sub_product: false },
      { id: 'sub', is_sub_product: true },
      { id: 'legacy' },
    ]

    expect(splitProducts(products)).toEqual({
      main: [products[0], products[2]],
      sub: [products[1]],
    })
  })
})
