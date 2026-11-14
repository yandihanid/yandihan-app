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

import { POST } from '@/app/api/cashier/receipt-print/route'

function request(body = { id: 'tx-1' }) {
  return new Request('http://localhost/api/cashier/receipt-print', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-cashier-token': 'store-token',
      cookie: 'yandihan_cashier_session=valid-session',
    },
    body: JSON.stringify(body),
  })
}

function rpcSupabase(result = { data: { print_count: 1, table_number: null }, error: null }) {
  const rpc = vi.fn().mockResolvedValue(result)
  return { supabase: { rpc, from: vi.fn(() => ({ select: vi.fn() })) }, rpc }
}

describe('cetak struk dari menu antrean', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkRateLimit.mockResolvedValue({ allowed: true })
  })

  it('menandai transaksi langsung sebagai COPY karena struk asli sudah diberikan', async () => {
    const { supabase, rpc } = rpcSupabase({ data: { print_count: 1, table_number: null }, error: null })
    authorizeCashier.mockResolvedValue({ cashier: { id: 'c-1', store_id: 'store-1' }, supabase })

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: 'tx-1', printCount: 1, copy: true })
    expect(rpc).toHaveBeenCalledWith('bump_receipt_print_count', {
      p_transaction_id: 'tx-1',
      p_store_id: 'store-1',
    })
  })

  it('pesanan On the Table: cetak pertama bukan COPY, berikutnya COPY', async () => {
    const { supabase } = rpcSupabase({ data: { print_count: 1, table_number: 4 }, error: null })
    authorizeCashier.mockResolvedValue({ cashier: { id: 'c-1', store_id: 'store-1' }, supabase })

    const first = await POST(request())
    expect(await first.json()).toMatchObject({ copy: false })

    const second = rpcSupabase({ data: { print_count: 2, table_number: 4 }, error: null })
    authorizeCashier.mockResolvedValue({ cashier: { id: 'c-1', store_id: 'store-1' }, supabase: second.supabase })

    const secondResponse = await POST(request())
    expect(await secondResponse.json()).toMatchObject({ copy: true })
  })

  it('menolak permintaan tanpa id transaksi', async () => {
    const { supabase } = rpcSupabase()
    authorizeCashier.mockResolvedValue({ cashier: { id: 'c-1', store_id: 'store-1' }, supabase })

    const response = await POST(request({}))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'id transaksi diperlukan' })
  })

  it('menolehkan 404 kalau transaksi tidak ada di toko ini', async () => {
    const { supabase } = rpcSupabase({ data: { print_count: 0, table_number: null }, error: null })
    authorizeCashier.mockResolvedValue({ cashier: { id: 'c-1', store_id: 'store-1' }, supabase })

    const response = await POST(request())

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Transaksi tidak ditemukan' })
  })

  it('menjelaskan kalau migrasi belum dijalankan', async () => {
    const { supabase } = rpcSupabase({ data: null, error: { code: '42883' } })
    authorizeCashier.mockResolvedValue({ cashier: { id: 'c-1', store_id: 'store-1' }, supabase })

    const response = await POST(request())

    expect(response.status).toBe(500)
    expect((await response.json()).error).toMatch(/migrasi 0023/i)
  })
})
