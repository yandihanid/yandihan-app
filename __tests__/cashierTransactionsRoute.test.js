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

function request(deviceId = 'device-one', { receipt } = {}) {
  const headers = new Headers({ 'x-cashier-token': 'cashier-token' })
  if (deviceId) headers.set('x-device-id', deviceId)
  const formData = new FormData()
  formData.set('paymentMethod', receipt ? 'QRIS/TF' : 'CASH')
  formData.set('items', JSON.stringify([{ product_id: 'product-1', qty: 1 }]))
  formData.set('cashReceived', '10.000')
  formData.set('clientTxId', '11111111-1111-4111-8111-111111111111')
  if (receipt) formData.set('receipt', receipt, 'receipt.jpg')
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

describe('cashier transaction route authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkRateLimit.mockResolvedValue({ allowed: true })
    normalizeItems.mockReturnValue({ items: [{ product_id: 'product-1', qty: 1 }] })
  })

  it.each([
    [null, 'Penyimpanan browser harus diizinkan', 403],
    ['device-two', 'Link kasir ini sudah dipakai di perangkat lain', 403],
  ])('rejects device %s before parsing or submitting', async (deviceId, error, status) => {
    authorizeCashier.mockResolvedValue({ error, status })
    const req = request(deviceId)
    const formData = vi.spyOn(req, 'formData')

    const response = await POST(req)

    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ error })
    expect(formData).not.toHaveBeenCalled()
    expect(normalizeItems).not.toHaveBeenCalled()
    expect(submitTransactionRpc).not.toHaveBeenCalled()
  })

  it('submits after the bound device is authorized', async () => {
    const { supabase, upload } = authorizedSupabase()
    authorizeCashier.mockResolvedValue({
      token: 'cashier-token',
      cashier: { id: 'cashier-1', store_id: 'store-1', device_id: 'device-one' },
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
      token: 'cashier-token',
      clientTxId: '11111111-1111-4111-8111-111111111111',
    }))
    expect(upload).not.toHaveBeenCalled()
    expect(await response.json()).toMatchObject({ success: true, transactionId: 'transaction-1' })
  })

  it('removes a newly uploaded receipt when an idempotent retry succeeds', async () => {
    const { supabase, upload, remove } = authorizedSupabase()
    authorizeCashier.mockResolvedValue({
      token: 'cashier-token',
      cashier: { id: 'cashier-1', store_id: 'store-1', device_id: 'device-one' },
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
    const response = await POST(request('device-one', { receipt }))

    expect(response.status).toBe(200)
    expect(upload).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledWith([
      expect.stringMatching(/^store-1\/\d+-receipt\.jpg$/),
    ])
    expect(await response.json()).toMatchObject({ success: true, idempotent: true })
  })
})
