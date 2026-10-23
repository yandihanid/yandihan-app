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

function request({ session = 'valid-session' } = {}) {
  const headers = new Headers({ 'x-cashier-token': 'store-token' })
  if (session) headers.set('cookie', `yandihan_cashier_session=${session}`)
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

describe('cashier loyalty route (session-based)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkRateLimit.mockResolvedValue({ allowed: true })
  })

  it('rejects request without session cookie', async () => {
    authorizeCashier.mockResolvedValue({ error: 'Sesi kasir berakhir. Silakan masuk kembali.', status: 401 })
    const req = request({ session: null })

    const response = await GET(req)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Sesi kasir berakhir. Silakan masuk kembali.' })
  })

  it('queries loyalty after successful authorization', async () => {
    const { supabase, query } = customerSupabase({
      id: 'customer-1',
      name: 'Pelanggan',
      phone: '6281234567890',
      visit_count: 5,
      total_spent: 100000,
    })
    authorizeCashier.mockResolvedValue({
      token: 'store-token',
      cashier: {
        id: 'cashier-1',
        store_id: 'store-1',
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

  it('returns disabled when loyalty is not enabled', async () => {
    const disabledStore = { ...enabledStore, pelanggan_enabled: false }
    const { supabase } = customerSupabase(null)
    authorizeCashier.mockResolvedValue({
      token: 'store-token',
      cashier: {
        id: 'cashier-1',
        store_id: 'store-1',
        stores: disabledStore,
      },
      supabase,
    })

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ enabled: false })
    expect(supabase.from).not.toHaveBeenCalled()
  })
})