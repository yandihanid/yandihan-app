import { describe, expect, it } from 'vitest'
import {
  wibDateString,
  wibDayRange,
  wibLastDaysRange,
  wibMonthRange,
  wibRangeFor,
} from '@/lib/time'

describe('WIB time ranges', () => {
  it('assigns early UTC time to the next WIB date', () => {
    expect(wibDateString(new Date('2026-01-01T17:30:00Z'))).toBe('2026-01-02')
  })

  it('builds half-open day boundaries in UTC', () => {
    expect(wibDayRange('2026-02-03')).toEqual({
      day: '2026-02-03',
      start: '2026-02-02T17:00:00.000Z',
      end: '2026-02-03T17:00:00.000Z',
    })
  })

  it('handles month and year rollover', () => {
    expect(wibMonthRange(2025, 12)).toEqual({
      start: '2025-11-30T17:00:00.000Z',
      end: '2025-12-31T17:00:00.000Z',
    })
  })

  it('builds inclusive last-N-days ranges with an exclusive end', () => {
    expect(wibLastDaysRange(7, new Date('2026-05-10T04:00:00Z'))).toEqual({
      start: '2026-05-03T17:00:00.000Z',
      end: '2026-05-10T17:00:00.000Z',
    })
  })

  it('maps dashboard filters and leaves all-time unbounded', () => {
    const now = new Date('2026-01-31T18:00:00Z')
    expect(wibRangeFor('TODAY', now)).toEqual({
      start: '2026-01-31T17:00:00.000Z',
      end: '2026-02-01T17:00:00.000Z',
    })
    expect(wibRangeFor('THIS_MONTH', now)).toEqual({
      start: '2026-01-31T17:00:00.000Z',
      end: '2026-02-28T17:00:00.000Z',
    })
    expect(wibRangeFor('ALL_TIME', now)).toBeNull()
  })
})
