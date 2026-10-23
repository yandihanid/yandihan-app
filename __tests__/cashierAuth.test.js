import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createServiceClient } = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/utils/supabase/service', () => ({ createServiceClient }))

import {
  authorizeCashier,
  hashSessionToken,
  CASHIER_SESSION_COOKIE,
} from '@/lib/cashierAuth'

function request(token = 'store-token', sessionToken = 'valid-session') {
  const headers = new Headers()
  if (token) headers.set('x-cashier-token', token)
  if (sessionToken) {
    headers.set('cookie', `${CASHIER_SESSION_COOKIE}=${sessionToken}`)
  }
  return { headers, cookies: { get: vi.fn((name) => name === CASHIER_SESSION_COOKIE ? { value: sessionToken } : undefined) } }
}

function serviceWithResults(...results) {
  const queue = [...results]
  const query = {}
  for (const method of ['select', 'update', 'eq', 'is', 'delete', 'lt', 'insert']) {
    query[method] = vi.fn(() => query)
  }
  query.maybeSingle = vi.fn(async () => queue.shift())
  query.single = vi.fn(async () => queue.shift())

  const supabase = { from: vi.fn(() => query) }
  createServiceClient.mockReturnValue(supabase)
  return { supabase, query }
}

describe('authorizeCashier (session-based auth)', () => {
  beforeEach(() => {
    createServiceClient.mockReset()
  })

  it('requires token header', async () => {
    const result = await authorizeCashier(request(null))
    expect(result).toMatchObject({ status: 400, error: 'Token kasir diperlukan' })
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('requires session cookie', async () => {
    const result = await authorizeCashier(request('store-token', null))
    expect(result).toMatchObject({ status: 401, error: 'Sesi kasir berakhir. Silakan masuk kembali.' })
  })

  it('rejects invalid store token', async () => {
    const { query, supabase } = serviceWithResults({ data: null, error: null })
    const result = await authorizeCashier(request('invalid-token', 'session-123'))
    expect(result).toMatchObject({ status: 404, error: 'Link kasir tidak valid' })
    expect(supabase.from).toHaveBeenCalledWith('stores')
  })

  it('rejects expired session', async () => {
    const { query } = serviceWithResults(
      { data: { id: 'store-1', cashier_token: 'store-token' }, error: null }, // resolveStoreByToken
      { data: null, error: null } // findSession (expired)
    )
    const result = await authorizeCashier(request('store-token', 'expired-session'))
    expect(result).toMatchObject({ status: 401, error: 'Sesi kasir berakhir. Silakan masuk kembali.' })
  })

  it('rejects session for different store', async () => {
    const { query } = serviceWithResults(
      { data: { id: 'store-1', cashier_token: 'store-token' }, error: null },
      { data: { token_hash: 'hash', cashier_id: 'cashier-1', store_id: 'other-store', expires_at: new Date(Date.now() + 86400000).toISOString() }, error: null }
    )
    const result = await authorizeCashier(request('store-token', 'session-123'))
    expect(result).toMatchObject({ status: 401, error: 'Sesi kasir berakhir. Silakan masuk kembali.' })
  })

  it('accepts valid session and returns cashier', async () => {
    const sessionHash = hashSessionToken('session-123')
    const { query } = serviceWithResults(
      { data: { id: 'store-1', cashier_token: 'store-token' }, error: null },
      { data: { token_hash: sessionHash, cashier_id: 'cashier-1', store_id: 'store-1', expires_at: new Date(Date.now() + 86400000).toISOString() }, error: null },
      { data: { id: 'cashier-1', name: 'Kasir Test', store_id: 'store-1' }, error: null }
    )

    const result = await authorizeCashier(request('store-token', 'session-123'), 'id, name, store_id')

    expect(result.error).toBeUndefined()
    expect(result.cashier).toEqual({ id: 'cashier-1', name: 'Kasir Test', store_id: 'store-1' })
    expect(result.store.id).toBe('store-1')
    expect(result.session.cashier_id).toBe('cashier-1')
  })

  it('rejects cashier that no longer exists', async () => {
    const sessionHash = hashSessionToken('session-123')
    const { query } = serviceWithResults(
      { data: { id: 'store-1', cashier_token: 'store-token' }, error: null },
      { data: { token_hash: sessionHash, cashier_id: 'cashier-1', store_id: 'store-1', expires_at: new Date(Date.now() + 86400000).toISOString() }, error: null },
      { data: null, error: null }
    )

    const result = await authorizeCashier(request('store-token', 'session-123'))
    expect(result).toMatchObject({ status: 401, error: 'Akun kasir tidak ditemukan. Silakan masuk kembali.' })
  })
})

describe('hashSessionToken', () => {
  it('returns consistent SHA-256 hash', () => {
    const token = 'test-session-token'
    const hash1 = hashSessionToken(token)
    const hash2 = hashSessionToken(token)
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // 32 bytes = 64 hex chars
  })

  it('returns different hashes for different tokens', () => {
    expect(hashSessionToken('token1')).not.toBe(hashSessionToken('token2'))
  })
})