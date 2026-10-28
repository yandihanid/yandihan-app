import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  createXenditInvoice,
  getXenditInvoice,
  isValidXenditSubAccountId,
  verifyXenditCallbackToken,
  xenditRequestHeaders,
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

describe('Xendit sub-account', () => {
  it('mengirim for-user-id saat invoice dibuat untuk sub-account toko', async () => {
    await createXenditInvoice({
      externalId: 'TABLE-order-1',
      amount: 16000,
      description: 'Pesanan Meja 1',
      forUserId: '65a1b2c3d4e5f6a7b8c9d0e1',
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.xendit.co/v2/invoices')
    expect(init.headers['for-user-id']).toBe('65a1b2c3d4e5f6a7b8c9d0e1')
    expect(init.headers['with-split-rule']).toBeUndefined()
  })

  it('tidak mengirim for-user-id untuk invoice platform (langganan/add-on)', async () => {
    await createXenditInvoice({ externalId: 'PRO-1M', amount: 78000, description: 'Langganan' })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['for-user-id']).toBeUndefined()
    expect(init.headers.Authorization).toMatch(/^Basic /)
  })

  it('mengirim with-split-rule hanya bila aturan split diatur', async () => {
    vi.stubEnv('XENDIT_SPLIT_RULE_ID', 'split_rule_9')

    await createXenditInvoice({
      externalId: 'TABLE-order-2',
      amount: 5000,
      description: 'Pesanan Meja 2',
      forUserId: 'biz_sub_2',
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['for-user-id']).toBe('biz_sub_2')
    expect(init.headers['with-split-rule']).toBe('split_rule_9')
  })

  it('aturan split tidak dikirim tanpa sub-account', () => {
    vi.stubEnv('XENDIT_SPLIT_RULE_ID', 'split_rule_9')

    const headers = xenditRequestHeaders({})
    expect(headers['with-split-rule']).toBeUndefined()
  })

  it('membaca status invoice sub-account dengan header yang sama', async () => {
    await getXenditInvoice('inv_1', { forUserId: 'biz_sub_3' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.xendit.co/v2/invoices/inv_1')
    expect(init.headers['for-user-id']).toBe('biz_sub_3')
  })

  it('tidak menanyakan invoice bila Xendit belum dikonfigurasi', async () => {
    vi.stubEnv('XENDIT_SECRET_KEY', '')

    expect(await getXenditInvoice('inv_1', { forUserId: 'biz_sub_3' })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('menerima callback token utama maupun token sub-account', () => {
    vi.stubEnv('XENDIT_SUB_ACCOUNT_CALLBACK_TOKENS', 'token-toko-a, token-toko-b')

    expect(verifyXenditCallbackToken('token-utama')).toBe(true)
    expect(verifyXenditCallbackToken('token-toko-b')).toBe(true)
    expect(verifyXenditCallbackToken('token-palsu')).toBe(false)
    expect(verifyXenditCallbackToken('')).toBe(false)
  })

  it('menolak semua token saat daftar token kosong', () => {
    vi.stubEnv('XENDIT_CALLBACK_TOKEN', '')
    vi.stubEnv('XENDIT_SUB_ACCOUNT_CALLBACK_TOKENS', ' , ')

    expect(verifyXenditCallbackToken('apa-saja')).toBe(false)
  })

  it('memvalidasi bentuk Business ID sub-account', () => {
    expect(isValidXenditSubAccountId('65a1b2c3d4e5f6a7b8c9d0e1')).toBe(true)
    expect(isValidXenditSubAccountId('  biz-sub_01  ')).toBe(true)
    expect(isValidXenditSubAccountId('')).toBe(false)
    expect(isValidXenditSubAccountId('ab')).toBe(false)
    expect(isValidXenditSubAccountId('ada spasi')).toBe(false)
    expect(isValidXenditSubAccountId('a'.repeat(65))).toBe(false)
  })
})
