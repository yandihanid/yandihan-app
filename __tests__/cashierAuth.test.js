import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createServiceClient } = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/utils/supabase/service', () => ({ createServiceClient }))

import { authorizeCashier } from '@/lib/cashierAuth'

function request(token = 'cashier-token', deviceId = 'device-one-123456') {
  const headers = new Headers()
  if (token) headers.set('x-cashier-token', token)
  if (deviceId) headers.set('x-device-id', deviceId)
  return { headers }
}

function serviceWithResults(...results) {
  const queue = [...results]
  const query = {}
  for (const method of ['select', 'update', 'eq', 'is']) {
    query[method] = vi.fn(() => query)
  }
  query.maybeSingle = vi.fn(async () => queue.shift())

  const supabase = { from: vi.fn(() => query) }
  createServiceClient.mockReturnValue(supabase)
  return { supabase, query }
}

describe('authorizeCashier', () => {
  beforeEach(() => {
    createServiceClient.mockReset()
  })

  it('requires both token and device headers', async () => {
    expect(await authorizeCashier(request(null))).toMatchObject({ status: 400 })
    expect(await authorizeCashier(request('cashier-token', null))).toMatchObject({ status: 403 })
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('accepts an already-bound matching device', async () => {
    serviceWithResults({
      data: { id: 'cashier-1', store_id: 'store-1', device_id: 'device-one-123456' },
      error: null,
    })

    const result = await authorizeCashier(request())

    expect(result.error).toBeUndefined()
    expect(result.cashier.store_id).toBe('store-1')
    expect(result.token).toBe('cashier-token')
  })

  it('claims the first device with a conditional update', async () => {
    const { query } = serviceWithResults(
      { data: { id: 'cashier-1', store_id: 'store-1', device_id: null }, error: null },
      { data: { device_id: 'device-one-123456' }, error: null }
    )

    const result = await authorizeCashier(request())

    expect(result.cashier.device_id).toBe('device-one-123456')
    expect(query.update).toHaveBeenCalledWith({ device_id: 'device-one-123456' })
    expect(query.is).toHaveBeenCalledWith('device_id', null)
  })

  it('rejects a device that loses the first-claim race', async () => {
    serviceWithResults(
      { data: { id: 'cashier-1', store_id: 'store-1', device_id: null }, error: null },
      { data: null, error: null },
      { data: { device_id: 'device-two-654321' }, error: null }
    )

    const result = await authorizeCashier(request())

    expect(result).toMatchObject({ status: 403 })
    expect(result.error).toMatch(/perangkat lain/i)
  })
})
