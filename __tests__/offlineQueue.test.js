import { describe, expect, it } from 'vitest'
import {
  syncCandidates,
  transitionAfterSync,
} from '@/app/c/[token]/offlineQueue'

const entries = [
  { clientTxId: 'a', receiptKey: '/receipts/a.jpg' },
  {
    clientTxId: 'b',
    receiptKey: '/receipts/b.jpg',
    blocked: true,
    syncError: 'Stok tidak cukup',
  },
  { clientTxId: 'c', receiptDataUrl: 'data:image/jpeg;base64,abc' },
]

describe('offline transaction queue transitions', () => {
  it('skips blocked entries during automatic retry', () => {
    expect(syncCandidates(entries).map((entry) => entry.clientTxId)).toEqual(['a', 'c'])
  })

  it('includes blocked entries during explicit retry without changing identity', () => {
    const candidates = syncCandidates(entries, { includeBlocked: true })
    expect(candidates.map((entry) => entry.clientTxId)).toEqual(['a', 'b', 'c'])
    expect(candidates[1]).toBe(entries[1])
  })

  it('removes only a successful entry', () => {
    const next = transitionAfterSync(entries, 'a', { type: 'success' })
    expect(next.map((entry) => entry.clientTxId)).toEqual(['b', 'c'])
    expect(next[0]).toBe(entries[1])
  })

  it('retains a rejected entry and receipt while blocking automatic retry', () => {
    const next = transitionAfterSync(entries, 'a', {
      type: 'rejected',
      error: 'Bukti pembayaran wajib.',
    })

    expect(next).toHaveLength(3)
    expect(next[0]).toMatchObject({
      clientTxId: 'a',
      receiptKey: '/receipts/a.jpg',
      blocked: true,
      syncError: 'Bukti pembayaran wajib.',
    })
  })

  it('leaves the current entry and remainder untouched after network ambiguity', () => {
    expect(transitionAfterSync(entries, 'a', { type: 'network' })).toBe(entries)
  })

  it('removes only the explicitly deleted entry', () => {
    const next = transitionAfterSync(entries, 'b', { type: 'delete' })
    expect(next.map((entry) => entry.clientTxId)).toEqual(['a', 'c'])
  })
})
