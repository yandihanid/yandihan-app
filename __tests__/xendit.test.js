import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  createXenditInvoice,
  getXenditInvoice,
  verifyXenditCallbackToken,
  xenditRequestHeaders,
  isXenditPaidStatus,
  isXenditDisbursedStatus,
  isXenditDisbursementFailedStatus,
  createXenditDisbursement,
  getXenditDisbursement,
  xenditApiUrl,
  isXenditConfigured,
  xenditAuthHeader,
} from '@/lib/xendit'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubEnv('XENDIT_SECRET_KEY', 'xnd_development_test')
  vi.stubEnv('XENDIT_CALLBACK_TOKEN', 'token-utama')
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ id: 'inv_1', invoice_url: 'https://checkout.xendit.co/web/inv_1' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Xendit library', () => {
  describe('isXenditConfigured', () => {
    it('mengembalikan true jika XENDIT_SECRET_KEY diisi', () => {
      const result = isXenditConfigured()
      expect(result).toBe(true)
    })

    it('mengembalikan false jika XENDIT_SECRET_KEY kosong', () => {
      // stubEnv dengan string kosong, bukan unstubEnv: Node menulis nilai
      // undefined menjadi teks "undefined", jadi variabelnya tetap terisi.
      vi.stubEnv('XENDIT_SECRET_KEY', '')
      const result = isXenditConfigured()
      expect(result).toBe(false)
    })
  })

  describe('xenditApiUrl', () => {
    it('mengembalikan URL Xendit standar', () => {
      const result = xenditApiUrl()
      expect(result).toBe('https://api.xendit.co')
    })
  })

  describe('xenditAuthHeader', () => {
    it('membuat header otorisasi Basic', () => {
      const result = xenditAuthHeader()
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^Basic /)
    })
  })

  describe('verifyXenditCallbackToken', () => {
    it('mengembalikan true untuk token yang cocok', () => {
      const result = verifyXenditCallbackToken('token-utama')
      expect(result).toBe(true)
    })

    it('mengembalikan false untuk token yang salah', () => {
      const result = verifyXenditCallbackToken('token-salah')
      expect(result).toBe(false)
    })

    it('mengembalikan false untuk token kosong', () => {
      const result = verifyXenditCallbackToken('')
      expect(result).toBe(false)
    })

    it('mengembalikan false untuk token null/undefined', () => {
      const result = verifyXenditCallbackToken(null)
      expect(result).toBe(false)
    })
  })

  describe('isXenditPaidStatus', () => {
    it('mengembalikan true untuk status PAID', () => {
      const result = isXenditPaidStatus({ status: 'PAID' })
      expect(result).toBe(true)
    })

    it('mengembalikan true untuk status SETTLED', () => {
      const result = isXenditPaidStatus({ status: 'SETTLED' })
      expect(result).toBe(true)
    })

    it('mengembalikan false untuk status pending', () => {
      const result = isXenditPaidStatus({ status: 'PENDING' })
      expect(result).toBe(false)
    })
  })

  describe('isXenditDisbursedStatus', () => {
    it('mengembalikan true untuk status DISBURSED', () => {
      const result = isXenditDisbursedStatus({ status: 'DISBURSED' })
      expect(result).toBe(true)
    })

    it('mengembalikan false untuk status lain', () => {
      const result = isXenditDisbursedStatus({ status: 'PENDING' })
      expect(result).toBe(false)
    })
  })

  describe('isXenditDisbursementFailedStatus', () => {
    it('mengembalikan true untuk status FAILED', () => {
      const result = isXenditDisbursementFailedStatus({ status: 'FAILED' })
      expect(result).toBe(true)
    })

    it('mengembalikan false untuk status lain', () => {
      const result = isXenditDisbursementFailedStatus({ status: 'PENDING' })
      expect(result).toBe(false)
    })
  })

  describe('createXenditInvoice', () => {
    let fetchResult

    beforeEach(async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ id: 'inv_1', invoice_url: 'https://checkout.xendit.co/web/inv_1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
      fetchResult = await createXenditInvoice({
        externalId: 'TABLE-order-1',
        amount: 16000,
        description: 'Pesanan uji',
        customerEmail: 'test@example.com',
        customerName: 'Test Customer',
        items: [{ name: 'Nasi Goreng', quantity: 1, price: 15000 }],
        successRedirectUrl: 'http://localhost:3000/success',
        failureRedirectUrl: 'http://localhost:3000/failed',
      })
    })

    it('membuat invoice dan mengembalikan response ok', async () => {
      expect(fetchResult.ok).toBe(true)
    })

    it('invoice dibuat tanpa header for-user-id', async () => {
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]
      if (lastCall) {
        const headers = lastCall[1]?.headers
        expect(headers?.forUserId).toBeUndefined()
      }
    })
  })

  describe('getXenditInvoice', () => {
    it('mengembalikan data invoice jika ditemukan', async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ id: 'inv_1', invoice_url: 'https://checkout.xendit.co/web/inv_1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )

      const result = await getXenditInvoice('inv_1')
      expect(result?.id).toBe('inv_1')
    })

    it('mengembalikan null jika invoice tidak ditemukan', async () => {
      fetchMock.mockResolvedValue(
        new Response(null, { status: 404, headers: { 'content-type': 'application/json' } })
      )

      const result = await getXenditInvoice('inv_999')
      expect(result).toBe(null)
    })
  })

  describe('createXenditDisbursement', () => {
    let fetchResult

    beforeEach(async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ id: 'disb_1', status: 'PENDING' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
      fetchResult = await createXenditDisbursement({
        externalId: 'PAYOUT-test-123',
        reference: 'Pencairan test',
        amount: 25000,
        bankCode: 'BCA',
        accountNumber: '1234567890',
        accountHolderName: 'Budi Santoso',
        description: 'Pencairan uji',
      })
    })

    it('membuat pencairan dan mengembalikan response ok', async () => {
      expect(fetchResult.ok).toBe(true)
    })

    it('pencairan dibuat dengan channel_code ID_BCA', async () => {
      const calls = fetchMock.mock.calls
      const lastCall = calls[calls.length - 1]
      if (lastCall) {
        // fetch(url, init) -> body ada di argumen kedua.
        const body = JSON.parse(lastCall[1]?.body || '{}')
        expect(body.channel_code).toBe('ID_BCA')
        expect(body.bank_code).toBe('BCA')
      }
    })
  })

  describe('getXenditDisbursement', () => {
    it('mengembalikan data pencairan jika ditemukan', async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ id: 'disb_1', status: 'DISBURSED' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )

      const result = await getXenditDisbursement('disb_1')
      expect(result?.status).toBe('DISBURSED')
    })

    it('mengembalikan null jika pencairan tidak ditemukan', async () => {
      fetchMock.mockResolvedValue(
        new Response(null, { status: 404, headers: { 'content-type': 'application/json' } })
      )

      const result = await getXenditDisbursement('disb_999')
      expect(result).toBe(null)
    })
  })
})