import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPro, maxCashiers, planTier } from '@/lib/plan'

afterEach(() => vi.useRealTimers())

describe('plan helpers', () => {
  it('keeps free stores on free limits', () => {
    const store = { subscription_tier: 'FREE', subscription_end_date: null }
    expect(isPro(store)).toBe(false)
    expect(planTier(store)).toBe('FREE')
    expect(maxCashiers(store)).toBe(1)
  })

  it('recognizes active PRO and expired PRO', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T00:00:00Z'))
    expect(isPro({ subscription_tier: 'PRO', subscription_end_date: '2026-02-01T00:00:00Z' })).toBe(true)
    expect(isPro({ subscription_tier: 'PRO', subscription_end_date: '2026-01-01T00:00:00Z' })).toBe(false)
  })

  it('treats PRO without an end date as an active manual grant', () => {
    const store = { subscription_tier: 'PRO', subscription_end_date: null }
    expect(planTier(store)).toBe('PRO')
    expect(maxCashiers(store)).toBe(Infinity)
  })
})
