import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  authorizeCashier,
  checkRateLimit,
  normalizeItems,
  submitTransactionRpc,
} = vi.hoisted(() => ({
  authorizeCashier: vi.fn(),
  checkRateLimit: vi.fn(),
  normalizeItems: vi.fn(),
  submitTransactionRpc: vi.fn(),
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
vi.mock('@/lib/transaction', () => ({
  normalizeItems,
  PAYMENT_METHODS: new Set(['CASH', 'QRIS/TF']),
  submitTransactionRpc,
}))

import { POST } from '@/app/api/cashier/transactions/route'

function request({ session = 'valid-session' } = {}) {
  const headers = new Headers({ 'x-cashier-token': 'store-token' })
  if (session) headers.set('cookie', `yandihan_cashier_session=${session}`)
  const formData = new FormData()
  formData.set('paymentMethod', 'CASH')
  formData.set('items', JSON.stringify([{ product_id: 'product-1', qty: 1 }]))
  formData.set('cashReceived', '10000')
  formData.set('clientTxId', '11111111-1111-4111-8111-111111111111')
  return new Request('http://localhost/api/cashier/transactions', {
    method: 'POST',
    headers,
    body: formData,
  })
}

function authorizedSupabase() {
  const upload = vi.fn().mockResolvedValue({ error: null })
  const remove = vi.fn().mockResolvedValue({ error: null })
  const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://example.test/receipt.jpg' } }))
  const fromStorage = vi.fn(() => ({ upload, remove, getPublicUrl }))
  return {
    supabase: { storage: { from: fromStorage } },
    upload,
    remove,
  }
}

describe('cashier transaction route authorization (session-based)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkRateLimit.mockResolvedValue({ allowed: true })
    normalizeItems.mockReturnValue({ items: [{ product_id: 'product-1', qty: 1 }] })
  })

  it('rejects request without session cookie', async () => {
    authorizeCashier.mockResolvedValue({ error: 'Sesi kasir berakhir. Silakan masuk kembali.', status: 401 })
    const req = request({ session: null })

    const response = await POST(req)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Sesi kasir berakhir. Silakan masuk kembali.' })
    expect(normalizeItems).not.toHaveBeenCalled()
    expect(submitTransactionRpc).not.toHaveBeenCalled()
  })

  it('rejects request with invalid store token', async () => {
    authorizeCashier.mockResolvedValue({ error: 'Link kasir tidak valid', status: 404 })
    const req = request()

    const response = await POST(req)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Link kasir tidak valid' })
  })

  it('submits transaction after successful authorization', async () => {
    const { supabase, upload } = authorizedSupabase()
    authorizeCashier.mockResolvedValue({
      token: 'store-token',
      cashier: { id: 'cashier-1', store_id: 'store-1' },
      supabase,
    })
    submitTransactionRpc.mockResolvedValue({
      success: true,
      transactionId: 'transaction-1',
      subtotal: 10000,
      discountPercent: 0,
      discount: 0,
      total: 10000,
      cashReceived: 10000,
      changeAmount: 0,
      status: 'completed',
      queueNumber: null,
      productName: '1x Produk',
      idempotent: false,
    })

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(submitTransactionRpc).toHaveBeenCalledWith(supabase, expect.objectContaining({
      cashierId: 'cashier-1',
      clientTxId: '11111111-1111-4111-8111-111111111111',
    }))
    expect(upload).not.toHaveBeenCalled()
    expect(await response.json()).toMatchObject({ success: true, transactionId: 'transaction-1' })
  })

  it('removes a newly uploaded receipt when an idempotent retry succeeds', async () => {
    const { supabase, upload, remove } = authorizedSupabase()
    authorizeCashier.mockResolvedValue({
      token: 'store-token',
      cashier: { id: 'cashier-1', store_id: 'store-1' },
      supabase,
    })
    submitTransactionRpc.mockResolvedValue({
      success: true,
      transactionId: 'transaction-1',
      subtotal: 10000,
      discountPercent: 0,
      discount: 0,
      total: 10000,
      cashReceived: null,
      changeAmount: null,
      status: 'pending',
      queueNumber: 7,
      productName: '1x Produk',
      idempotent: true,
    })

    const receipt = new Blob(['receipt'], { type: 'image/jpeg' })
    const req = request()
    // Add receipt to formData
    const originalFormData = req.formData
    req.formData = vi.fn().mockResolvedValue(new FormData())
    req.formData.mockResolvedValueOnce((() => {
      const fd = new FormData()
      fd.set('paymentMethod', 'QRIS/TF')
      fd.set('items', JSON.stringify([{ product_id: 'product-1', qty: 1 }]))
      fd.set('cashReceived', '')
      fd.set('clientTxId', '11111111-1111-4111-8111-111111111111')
      fd.set('receipt', receipt, 'receipt.jpg')
      return fd
    })())

    const response = await POST(req)

    expect(response.status).toBe(200)
    expect(upload).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledWith([
      expect.stringMatching(/^store-1\/\d+-receipt\.jpg$/),
    ])
    expect(await response.json()).toMatchObject({ success: true, idempotent: true })
  })
})