import { describe, expect, it } from 'vitest'
import { normalizeQueueStatus } from '@/lib/queue'

describe('queue helpers', () => {
  it('allows only pending and done statuses', () => {
    expect(normalizeQueueStatus(' pending ')).toBe('pending')
    expect(normalizeQueueStatus('DONE')).toBe('done')
    expect(normalizeQueueStatus('completed')).toBeNull()
    expect(normalizeQueueStatus(null)).toBeNull()
  })
})
