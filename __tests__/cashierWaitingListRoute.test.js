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
vi.mock('@/lib/time', () => ({
  wibDayRange: () => ({ day: '2026-09-12' }),
}))

import { GET, PATCH } from '@/app/api/cashier/waiting-list/route'

function request(status = 'pending', { session = 'valid-session' } = {}) {
  const headers = new Headers({ 'x-cashier-token': 'store-token' })
  if (session) headers.set('cookie', `yandihan_cashier_session=${session}`)
  return new Request(`http://localhost/api/cashier/waiting-list?status=${status}`, { headers })
}

function patchRequest(body = { id: 'ticket-1' }, { session = 'valid-session' } = {}) {
  const headers = new Headers({ 'x-cashier-token': 'store-token', 'content-type': 'application/json' })
  if (session) headers.set('cookie', `yandihan_cashier_session=${session}`)
  return new Request('http://localhost/api/cashier/waiting-list', {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
}

function getSupabase(result = { data: [{ id: 'ticket-1', queue_number: 7 }], error: null }) {
  const query = {}
  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.order = vi.fn(() => query)
  query.limit = vi.fn().mockResolvedValue(result)
  return { supabase: { from: vi.fn(() => query) }, query }
}

function patchSupabase(result = { data: { id: 'ticket-1', queue_number: 7 }, error: null }) {
  const query = {}
  query.update = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.select = vi.fn(() => query)
  query.maybeSingle = vi.fn().mockResolvedValue(result)
  return { supabase: { from: vi.fn(() => query) }, query }
}

function authorizeWith(supabase, enabled = true) {
  authorizeCashier.mockResolvedValue({
    cashier: {
      id: 'cashier-1',
      store_id: 'store-1',
      stores: { waiting_list_enabled: enabled },
    },
    supabase,
  })
}

describe('cashier waiting-list route (session-based)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkRateLimit.mockResolvedValue({ allowed: true })
  })

  it.each(['pending', 'done'])('loads %s tickets for the authorized store and WIB day', async (status) => {
    const { supabase, query } = getSupabase()
    authorizeWith(supabase)

    const response = await GET(request(status))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ enabled: true, tickets: [{ id: 'ticket-1' }] })
    expect(query.eq.mock.calls).toEqual([
      ['store_id', 'store-1'],
      ['queue_date', '2026-09-12'],
      ['status', status],
    ])
    expect(query.order).toHaveBeenCalledWith('queue_number', { ascending: true })
  })

  it('rejects an unknown queue status before querying transactions', async () => {
    const { supabase } = getSupabase()
    authorizeWith(supabase)

    const response = await GET(request('cancelled'))

    expect(response.status).toBe(400)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('still returns pending tickets when the waiting list feature is disabled', async () => {
    // Pesanan On the Table sengaja berstatus 'pending' agar tetap masuk antrean
    // kasir walau fitur waiting list toko dimatikan.
    const { supabase, query } = getSupabase()
    authorizeWith(supabase, false)

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ enabled: false, tickets: [{ id: 'ticket-1' }] })
    expect(query.eq).toHaveBeenCalledWith('status', 'pending')
  })

  it('marks only a pending ticket from the authorized store and WIB day as done', async () => {
    const { supabase, query } = patchSupabase()
    authorizeWith(supabase)

    const response = await PATCH(patchRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, id: 'ticket-1', queue_number: 7 })
    expect(query.update).toHaveBeenCalledWith({ status: 'done' })
    expect(query.eq.mock.calls).toEqual([
      ['id', 'ticket-1'],
      ['store_id', 'store-1'],
      ['queue_date', '2026-09-12'],
      ['status', 'pending'],
    ])
  })

  it('returns 404 when no matching pending ticket exists', async () => {
    const { supabase } = patchSupabase({ data: null, error: null })
    authorizeWith(supabase)

    const response = await PATCH(patchRequest())

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Tiket tidak ditemukan' })
  })

  it('allows completing a ticket while the waiting list feature is disabled', async () => {
    const { supabase, query } = patchSupabase()
    authorizeWith(supabase, false)

    const response = await PATCH(patchRequest())

    expect(response.status).toBe(200)
    expect(query.update).toHaveBeenCalledWith({ status: 'done' })
  })

  it('rejects request without session cookie', async () => {
    authorizeCashier.mockResolvedValue({ error: 'Sesi kasir berakhir. Silakan masuk kembali.', status: 401 })
    const req = request('pending', { session: null })

    const response = await GET(req)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Sesi kasir berakhir. Silakan masuk kembali.' })
  })
})