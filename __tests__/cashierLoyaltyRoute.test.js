import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authorizeCashier, checkRateLimit } = vi.hoisted(() => ({
  authorizeCashier: vi.fn(),
  checkRateLimit: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({
  NextResponse: { json: (body, init) => Response.json(body, init) },
}))
vi.mock('@/lib/cashierAuth', () => ({
  authorizeCashier,
  readCashierToken: (request) => request.headers.get('x-cashier-token'),
  tokenBucket: (prefix, token) => `${prefix}:${token}`,
}))
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit,
  tooManyRequests: () => Response.json({ error: 'Terlalu banyak permintaan' }, { status: 429 }),
}))

import { GET } from '@/app/api/cashier/loyalty/route'

function request(deviceId = 'device-one') {
  const headers = new Headers({ 'x-cashier-token': 'cashier-token' })
  if (deviceId) headers.set('x-device-id', deviceId)
  return new Request('http://localhost/api/cashier/loyalty?phone=081234567890', { headers })
}

function customerSupabase(customer) {
  const query = {}
  for (const method of ['select', 'eq']) query[method] = vi.fn(() => query)
  query.maybeSingle = vi.fn().mockResolvedValue({ data: customer, error: null })
  return { supabase: { from: vi.fn(() => query) }, query }
}

const enabledStore = {
  subscription_tier: 'PRO',
  subscription_end_date: '2099-01-01T00:00:00.000Z',
  pelanggan_enabled: true,
  visit_threshold: 5,
  discount_percent: 10,
}

describe('cashier loyalty route authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkRateLimit.mockResolvedValue({ allowed: true })
  })

  it.each([
    [null, 'Penyimpanan browser harus diizinkan', 403],
    ['device-two', 'Link kasir ini sudah dipakai di perangkat lain', 403],
  ])('rejects device %s before querying customers', async (deviceId, error, status) => {
    const from = vi.fn()
    authorizeCashier.mockResolvedValue({ error, status, supabase: { from } })

    const response = await GET(request(deviceId))

    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ error })
    expect(from).not.toHaveBeenCalled()
  })

  it('queries loyalty after the bound device is authorized', async () => {
    const { supabase, query } = customerSupabase({
      id: 'customer-1',
      name: 'Pelanggan',
      phone: '6281234567890',
      visit_count: 5,
      total_spent: 100000,
    })
    authorizeCashier.mockResolvedValue({
      token: 'cashier-token',
      cashier: {
        id: 'cashier-1',
        store_id: 'store-1',
        device_id: 'device-one',
        stores: enabledStore,
      },
      supabase,
    })

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(supabase.from).toHaveBeenCalledWith('customers')
    expect(query.eq).toHaveBeenCalledWith('store_id', 'store-1')
    expect(query.eq).toHaveBeenCalledWith('phone', '081234567890')
    expect(await response.json()).toMatchObject({ enabled: true, known: true, eligible: true })
  })
})
