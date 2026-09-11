import { describe, expect, it } from 'vitest'
import {
  MAX_FLAT_ITEMS,
  MAX_LINES,
  MAX_QTY,
  normalizeItems,
} from '@/lib/transactionValidation'

const PRODUCT_ID = '123e4567-e89b-12d3-a456-426614174000'
const SUB_ID = '123e4567-e89b-12d3-a456-426614174001'

describe('transaction item validation', () => {
  it('normalizes JSON item and sub-item quantities', () => {
    expect(normalizeItems(JSON.stringify([
      { product_id: PRODUCT_ID, qty: '2', subs: [{ product_id: SUB_ID, qty: '1' }] },
    ]))).toEqual({
      items: [{ product_id: PRODUCT_ID, qty: 2, subs: [{ product_id: SUB_ID, qty: 1 }] }],
    })
  })

  it('rejects malformed and empty payloads', () => {
    expect(normalizeItems('{bad').error).toMatch(/tidak valid/i)
    expect(normalizeItems([]).error).toMatch(/belum ada item/i)
  })

  it('rejects invalid UUIDs and quantities', () => {
    expect(normalizeItems([{ product_id: 'bad', qty: 1 }]).error).toMatch(/tanpa produk/i)
    expect(normalizeItems([{ product_id: PRODUCT_ID, qty: 0 }]).error).toContain(String(MAX_QTY))
    expect(normalizeItems([{ product_id: PRODUCT_ID, qty: MAX_QTY + 1 }]).error).toContain(String(MAX_QTY))
  })

  it('enforces item and sub-item line limits', () => {
    const item = { product_id: PRODUCT_ID, qty: 1 }
    expect(normalizeItems(Array.from({ length: MAX_LINES + 1 }, () => item)).error).toMatch(/maksimal/i)
    expect(normalizeItems([{ ...item, subs: Array.from({ length: MAX_LINES + 1 }, () => ({ product_id: SUB_ID, qty: 1 })) }]).error).toMatch(/sub-produk/i)
  })

  it('rejects payloads above the flattened item cap', () => {
    const subsPerLine = MAX_FLAT_ITEMS / MAX_LINES - 1
    const item = {
      product_id: PRODUCT_ID,
      qty: 1,
      subs: Array.from({ length: subsPerLine }, () => ({ product_id: SUB_ID, qty: 1 })),
    }
    expect(normalizeItems(Array.from({ length: MAX_LINES }, () => item))).toHaveProperty('items')

    const overLimit = Array.from({ length: MAX_LINES }, () => item)
    overLimit[0] = {
      ...item,
      subs: [...item.subs, { product_id: SUB_ID, qty: 1 }],
    }
    expect(normalizeItems(overLimit).error).toMatch(/maksimal/i)
  })

  it('rejects malformed sub-items', () => {
    expect(normalizeItems([{ product_id: PRODUCT_ID, qty: 1, subs: [{ product_id: '', qty: 1 }] }]).error).toMatch(/sub-produk/i)
  })
})
