import { describe, expect, it } from 'vitest'

import {
  MAX_LOGO_LENGTH,
  MAX_REVIEW_NOTE_LENGTH,
  parseLogoInput,
  parseReviewNote,
  parseReviewUrl,
} from '@/lib/storeBrand'

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='

describe('logo usaha', () => {
  it('treats an empty value as "remove the logo"', () => {
    expect(parseLogoInput('')).toEqual({ logoUrl: null, error: null })
    expect(parseLogoInput('   ')).toEqual({ logoUrl: null, error: null })
    expect(parseLogoInput(undefined)).toEqual({ logoUrl: null, error: null })
  })

  it('accepts an uploaded image as a data URL', () => {
    expect(parseLogoInput(PNG_DATA_URL)).toEqual({ logoUrl: PNG_DATA_URL, error: null })
  })

  it('accepts a hosted logo URL', () => {
    const url = 'https://cdn.example.test/logo.png'
    expect(parseLogoInput(url)).toEqual({ logoUrl: url, error: null })
  })

  it('rejects a data URL that is not an image', () => {
    const result = parseLogoInput('data:text/html;base64,PHNjcmlwdD4=')
    expect(result.logoUrl).toBeNull()
    expect(result.error).toMatch(/format logo/i)
  })

  it('rejects a payload that is neither an image nor a URL', () => {
    const result = parseLogoInput('bukan-logo')
    expect(result.logoUrl).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('rejects an oversized logo', () => {
    const huge = `data:image/png;base64,${'A'.repeat(MAX_LOGO_LENGTH)}`
    const result = parseLogoInput(huge)
    expect(result.logoUrl).toBeNull()
    expect(result.error).toMatch(/besar/i)
  })
})

describe('link rating Google Maps', () => {
  it('treats an empty link as the feature being switched off', () => {
    expect(parseReviewUrl('')).toEqual({ url: null, error: null })
    expect(parseReviewUrl(null)).toEqual({ url: null, error: null })
  })

  it('accepts the link shapes Google Maps actually produces', () => {
    const links = [
      'https://maps.app.goo.gl/abc123',
      'https://g.page/r/abc123',
      'https://www.google.com/maps/place/Warung+Bu+Ida',
      'https://goo.gl/maps/abc123',
    ]
    for (const link of links) {
      expect(parseReviewUrl(link).error).toBeNull()
    }
  })

  it('rejects a link that is not Google Maps', () => {
    const result = parseReviewUrl('https://instagram.com/warungbuida')
    expect(result.url).toBeNull()
    expect(result.error).toMatch(/google maps/i)
  })

  it('rejects a link that is not a URL at all', () => {
    const result = parseReviewUrl('hmm Maps Review')
    expect(result.url).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('rejects a javascript: payload', () => {
    const result = parseReviewUrl('javascript:alert(1)')
    expect(result.url).toBeNull()
    expect(result.error).toBeTruthy()
  })
})

describe('catatan rating', () => {
  it('keeps an empty note as null', () => {
    expect(parseReviewNote('')).toEqual({ note: null, error: null })
  })

  it('keeps a short note as it is', () => {
    expect(parseReviewNote(' Rate kami ya ')).toEqual({
      note: 'Rate kami ya',
      error: null,
    })
  })

  it('rejects a note that is too long', () => {
    const result = parseReviewNote('x'.repeat(MAX_REVIEW_NOTE_LENGTH + 1))
    expect(result.note).toBeNull()
    expect(result.error).toMatch(/terlalu panjang/i)
  })
})
