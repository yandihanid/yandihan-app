import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClient, requireStoreOwnership } = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireStoreOwnership: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({
  NextResponse: { json: (body, init) => Response.json(body, init) },
}))
vi.mock('@/utils/supabase/server', () => ({ createClient }))
vi.mock('@/lib/dal', () => ({ requireStoreOwnership }))

import { PATCH } from '@/app/api/settings/store/route'

function request(body) {
  return new Request('http://localhost/api/settings/store', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('store settings route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireStoreOwnership.mockResolvedValue({
      store: { id: 'store-1', user_id: 'user-1' },
      error: null,
    })
  })

  it('does not allow require_sub_product to be activated', async () => {
    const response = await PATCH(request({
      storeId: 'store-1',
      require_sub_product: true,
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Tidak ada perubahan valid' })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('persists only supported boolean settings', async () => {
    const query = {}
    query.update = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.select = vi.fn(() => query)
    query.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'store-1' }, error: null })
    createClient.mockResolvedValue({ from: vi.fn(() => query) })

    const response = await PATCH(request({
      storeId: 'store-1',
      waiting_list_enabled: true,
      require_sub_product: true,
    }))

    expect(response.status).toBe(200)
    expect(query.update).toHaveBeenCalledWith({ waiting_list_enabled: true })
    expect(await response.json()).toEqual({ success: true, waiting_list_enabled: true })
  })
})
