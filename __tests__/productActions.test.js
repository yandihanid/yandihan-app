import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClient, requireProductOwnership, revalidatePath } = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireProductOwnership: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({ createClient }))
vi.mock('@/lib/dal', () => ({
  requireStoreOwnership: vi.fn(),
  requireProductOwnership,
}))
vi.mock('next/cache', () => ({ revalidatePath }))

import { updateStock } from '@/app/dashboard/produk/actions'

function stockForm({ currentStock = '10', newStock = '8' } = {}) {
  const formData = new FormData()
  formData.set('productId', 'product-1')
  formData.set('currentStock', currentStock)
  formData.set('newStock', newStock)
  return formData
}

function stockSupabase(result) {
  const query = {}
  for (const method of ['update', 'eq', 'select']) query[method] = vi.fn(() => query)
  query.maybeSingle = vi.fn().mockResolvedValue(result)
  return { supabase: { from: vi.fn(() => query) }, query }
}

describe('dashboard product stock updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireProductOwnership.mockResolvedValue({
      product: { id: 'product-1', store_id: 'store-1', stock: 10 },
      error: null,
    })
  })

  it('updates only when the rendered stock still matches', async () => {
    const { supabase, query } = stockSupabase({ data: { id: 'product-1' }, error: null })
    createClient.mockResolvedValue(supabase)

    const result = await updateStock(stockForm())

    expect(result).toEqual({ success: true })
    expect(query.update).toHaveBeenCalledWith({ stock: 8 })
    expect(query.eq).toHaveBeenCalledWith('stock', 10)
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/produk')
  })

  it('rejects a stale form without overwriting concurrent stock', async () => {
    const { supabase, query } = stockSupabase({ data: null, error: null })
    createClient.mockResolvedValue(supabase)

    const result = await updateStock(stockForm())

    expect(query.eq).toHaveBeenCalledWith('stock', 10)
    expect(result.error).toMatch(/sudah berubah/i)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('rejects a missing rendered stock before querying products', async () => {
    const result = await updateStock(stockForm({ currentStock: '' }))

    expect(result.error).toMatch(/tidak valid/i)
    expect(createClient).not.toHaveBeenCalled()
  })
})
