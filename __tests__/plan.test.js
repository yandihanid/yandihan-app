import { describe, expect, it } from 'vitest'
import {
  isPro,
  planTier,
  maxCashiers,
  PRO_MONTHLY_PRICE_IDR,
  PRO_ON_TABLE_MONTHLY_PRICE_IDR,
  PLAN_LIMITS,
} from '@/lib/plan'

const FREE_STORE = { subscription_tier: 'FREE', subscription_end_date: null }
const PRO_ACTIVE_STORE = {
  subscription_tier: 'PRO',
  subscription_end_date: '2026-12-31T17:00:00.000Z',
}
const PRO_EXPIRED_STORE = {
  subscription_tier: 'PRO',
  subscription_end_date: '2020-01-01T00:00:00.000Z',
}
const PRO_NO_END_DATE = { subscription_tier: 'PRO', subscription_end_date: null }
const NULL_STORE = null

describe('plan helpers', () => {
  describe('isPro', () => {
    it('FREE bukan PRO', () => {
      expect(isPro(FREE_STORE)).toBe(false)
    })

    it('PRO aktif adalah PRO', () => {
      expect(isPro(PRO_ACTIVE_STORE)).toBe(true)
    })

    it('PRO kedaluwarsa bukan PRO', () => {
      expect(isPro(PRO_EXPIRED_STORE)).toBe(false)
    })

    it('PRO tanpa end_date dianggap aktif (grandfather)', () => {
      expect(isPro(PRO_NO_END_DATE)).toBe(true)
    })

    it('null bukan PRO', () => {
      expect(isPro(NULL_STORE)).toBe(false)
    })
  })

  describe('planTier', () => {
    it('mengembalikan FREE untuk non-PRO', () => {
      expect(planTier(FREE_STORE)).toBe('FREE')
      expect(planTier(NULL_STORE)).toBe('FREE')
    })

    it('mengembalikan PRO untuk PRO aktif', () => {
      expect(planTier(PRO_ACTIVE_STORE)).toBe('PRO')
    })
  })

  describe('maxCashiers', () => {
    it('FREE dibatasi 1 kasir', () => {
      expect(maxCashiers(FREE_STORE)).toBe(PLAN_LIMITS.FREE.maxCashiers)
    })

    it('PRO tidak terbatas', () => {
      expect(maxCashiers(PRO_ACTIVE_STORE)).toBe(Infinity)
    })
  })

  describe('harga', () => {
    it('PRO bulanan Rp 78.000', () => {
      expect(PRO_MONTHLY_PRICE_IDR).toBe(78000)
    })

    it('PRO + On the Table = Rp 128.000', () => {
      expect(PRO_ON_TABLE_MONTHLY_PRICE_IDR).toBe(128000)
    })
  })
})
