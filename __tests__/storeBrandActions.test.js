import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClient, requireStoreOwnership, revalidatePath } = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireStoreOwnership: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/utils/supabase/server', () => ({ createClient }))
vi.mock('@/utils/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/dal', () => ({ requireStoreOwnership }))
vi.mock('next/cache', () => ({ revalidatePath }))

import { updateStoreLogo, updateStoreReview } from '@/app/dashboard/settings/actions'

function storeSupabase(result) {
  const query = {}
  for (const method of ['update', 'eq', 'select']) query[method] = vi.fn(() => query)
  query.maybeSingle = vi.fn().mockResolvedValue(result)
  return { supabase: { from: vi.fn(() => query) }, query }
}

function logoForm({ storeId = 'store-1', logoUrl = '' } = {}) {
  const formData = new FormData()
  formData.set('storeId', storeId)
  formData.set('logoUrl', logoUrl)
  return formData
}

function reviewForm({ storeId = 'store-1', reviewUrl = '', reviewNote = '' } = {}) {
  const formData = new FormData()
  formData.set('storeId', storeId)
  formData.set('reviewUrl', reviewUrl)
  formData.set('reviewNote', reviewNote)
  return formData
}

describe('menyimpan logo usaha', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireStoreOwnership.mockResolvedValue({
      store: { id: 'store-1', user_id: 'user-1' },
      error: null,
    })
  })

  it('stores an uploaded logo', async () => {
    const { supabase, query } = storeSupabase({ data: { id: 'store-1' }, error: null })
    createClient.mockResolvedValue(supabase)

    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
    const result = await updateStoreLogo(logoForm({ logoUrl: dataUrl }))

    expect(result).toEqual({ success: true })
    expect(query.update).toHaveBeenCalledWith({ logo_url: dataUrl })
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/settings')
  })

  it('clears the logo when the field is empty', async () => {
    const { supabase, query } = storeSupabase({ data: { id: 'store-1' }, error: null })
    createClient.mockResolvedValue(supabase)

    const result = await updateStoreLogo(logoForm())

    expect(result).toEqual({ success: true })
    expect(query.update).toHaveBeenCalledWith({ logo_url: null })
  })

  it('rejects a payload that is not an image without touching the database', async () => {
    const result = await updateStoreLogo(logoForm({ logoUrl: '<script>alert(1)</script>' }))

    expect(result.error).toBeTruthy()
    expect(createClient).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('does not write when the store belongs to somebody else', async () => {
    requireStoreOwnership.mockResolvedValue({
      store: null,
      error: 'Toko tidak ditemukan atau bukan milik Anda',
    })

    const result = await updateStoreLogo(logoForm({ logoUrl: 'https://cdn.test/a.png' }))

    expect(result.error).toMatch(/bukan milik/i)
    expect(createClient).not.toHaveBeenCalled()
  })
})

describe('menyimpan pengaturan rating Google Maps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireStoreOwnership.mockResolvedValue({
      store: { id: 'store-1', user_id: 'user-1' },
      error: null,
    })
  })

  it('stores the review link and the note', async () => {
    const { supabase, query } = storeSupabase({ data: { id: 'store-1' }, error: null })
    createClient.mockResolvedValue(supabase)

    const result = await updateStoreReview(
      reviewForm({
        reviewUrl: 'https://maps.app.goo.gl/abc123',
        reviewNote: 'Rate kami ya, dapat es teh gratis',
      })
    )

    expect(result).toEqual({ success: true })
    expect(query.update).toHaveBeenCalledWith({
      gmaps_review_url: 'https://maps.app.goo.gl/abc123',
      gmaps_review_note: 'Rate kami ya, dapat es teh gratis',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/settings')
  })

  it('switches the feature off when the link is empty', async () => {
    const { supabase, query } = storeSupabase({ data: { id: 'store-1' }, error: null })
    createClient.mockResolvedValue(supabase)

    const result = await updateStoreReview(reviewForm())

    expect(result).toEqual({ success: true })
    expect(query.update).toHaveBeenCalledWith({
      gmaps_review_url: null,
      gmaps_review_note: null,
    })
  })

  it('rejects a link that is not Google Maps', async () => {
    const result = await updateStoreReview(reviewForm({ reviewUrl: 'https://wa.me/62812' }))

    expect(result.error).toMatch(/google maps/i)
    expect(createClient).not.toHaveBeenCalled()
  })
})
