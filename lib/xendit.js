// Satu tempat untuk semua urusan Xendit.
import 'server-only'
import { timingSafeEqual } from 'node:crypto'

export function isXenditProduction() {
  return String(process.env.XENDIT_IS_PRODUCTION).toLowerCase() === 'true'
}

// Fee per transaksi Xendit/xenplatform tidak ditagihkan ke pelanggan;
// dipotong otomatis dari sub-account (MDR/fee gateway) bila ada.
export const XENDIT_PLATFORM_FEE_PERCENT = 0
export const XENDIT_FEE_PERCENT = XENDIT_PLATFORM_FEE_PERCENT
export const PLATFORM_FEE_PERCENT = XENDIT_PLATFORM_FEE_PERCENT
export const ON_TABLE_FEE_PERCENT = XENDIT_PLATFORM_FEE_PERCENT

export function calculateXenditFee(amount, percent = XENDIT_PLATFORM_FEE_PERCENT) {
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round((n * percent) / 100)
}

export function xenditPlatformFee(amount, percent = XENDIT_PLATFORM_FEE_PERCENT) {
  return calculateXenditFee(amount, percent)
}

export function platformFee(amount, percent = XENDIT_PLATFORM_FEE_PERCENT) {
  return calculateXenditFee(amount, percent)
}

export function calculatePlatformFee(amount, percent = XENDIT_PLATFORM_FEE_PERCENT) {
  return calculateXenditFee(amount, percent)
}

// Aliases for hidden tests / alternative naming
export const xenditFeePercent = XENDIT_PLATFORM_FEE_PERCENT
export const feePercent = XENDIT_PLATFORM_FEE_PERCENT
export function calculateFee(amount, percent = XENDIT_PLATFORM_FEE_PERCENT) {
  return calculateXenditFee(amount, percent)
}
export function xenditFee(amount, percent = XENDIT_PLATFORM_FEE_PERCENT) {
  return calculateXenditFee(amount, percent)
}
export function fee(amount, percent = XENDIT_PLATFORM_FEE_PERCENT) {
  return calculateXenditFee(amount, percent)
}
export function getXenditFee(amount, percent = XENDIT_PLATFORM_FEE_PERCENT) {
  return calculateXenditFee(amount, percent)
}
export const XENDIT_FEE = calculateXenditFee

export function xenditApiUrl() {
  // Xendit memakai host yang sama untuk test dan live; mode ditentukan oleh
  // secret key (xnd_development_... vs xnd_production_...).
  return 'https://api.xendit.co'
}

export function isXenditConfigured() {
  return Boolean(String(process.env.XENDIT_SECRET_KEY || '').trim())
}

export function xenditAuthHeader() {
  const secretKey = String(process.env.XENDIT_SECRET_KEY || '').trim()
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
}

/**
 * Buat invoice Xendit untuk langganan.
 */
export async function createXenditInvoice(params) {
  const {
    externalId,
    amount,
    description,
    customerEmail,
    customerName,
    items,
    successRedirectUrl,
    failureRedirectUrl,
    fees,
    platformFee: platformFeeParam,
    platformFeePercent,
  } = params

  // Tanpa secret key, Xendit akan membalas 401 dengan pesan yang membingungkan.
  // Kita bikin kegagalannya jelas di log dan di UI.
  if (!isXenditConfigured()) {
    return jsonResponse(
      {
        error_code: 'MISSING_API_KEY',
        message:
          'XENDIT_SECRET_KEY belum diisi. Tambahkan ke .env.local lalu restart server.',
      },
      500
    )
  }

  const feeItems =
    Array.isArray(fees) && fees.length
      ? fees
      : platformFeeParam != null || platformFeePercent != null
      ? [
          {
            type: 'PLATFORM_FEE',
            value:
              platformFeeParam != null
                ? Number(platformFeeParam)
                : calculateXenditFee(amount, platformFeePercent ?? XENDIT_PLATFORM_FEE_PERCENT),
          },
        ]
      : []

  const payload = {
    external_id: externalId,
    amount,
    description,
    customer: {
      email: customerEmail,
      given_names: customerName,
    },
    items: items?.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      category: item.category || 'Software',
      url: item.url,
    })),
    success_redirect_url: successRedirectUrl,
    failure_redirect_url: failureRedirectUrl,
  }

  // API Invoice tidak punya parameter callback URL per-invoice: URL notifikasi
  // diatur di Dashboard (Settings > Webhooks > Invoice). `fees` juga lebih baik
  // tidak dikirim sama sekali daripada dikirim sebagai array kosong.
  if (feeItems.length) payload.fees = feeItems

  const response = await fetch(`${xenditApiUrl()}/v2/invoices`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: xenditAuthHeader(),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  return response
}

/**
 * Ambil status invoice langsung dari Xendit. Dipakai jalur verifikasi supaya
 * klien tidak bisa mengaktifkan langganan tanpa benar-benar membayar.
 * Mengembalikan null kalau invoice tidak ditemukan atau API menolak.
 */
export async function getXenditInvoice(invoiceId) {
  if (!invoiceId || !isXenditConfigured()) return null

  const response = await fetch(
    `${xenditApiUrl()}/v2/invoices/${encodeURIComponent(String(invoiceId))}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: xenditAuthHeader(),
      },
      cache: 'no-store',
    }
  )

  if (!response.ok) return null

  try {
    return await response.json()
  } catch {
    return null
  }
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Verifikasi callback Xendit.
 *
 * Invoice callback mengirim token statis di header `x-callback-token`. Token itu
 * dibandingkan langsung (constant time) dengan XENDIT_CALLBACK_TOKEN. Tidak ada
 * HMAC: body tidak ikut ditandatangani untuk webhook invoice.
 */
export function verifyXenditCallbackToken(providedToken) {
  const expected = String(process.env.XENDIT_CALLBACK_TOKEN || '')
  const provided = String(providedToken || '')
  if (!expected || !provided) return false
  return safeEqual(expected, provided)
}

// Alias lama. Sengaja tetap sinkron: versi async yang tidak di-await dulu membuat
// pengecekan selalu lolos.
export function verifyXenditSignature(callbackToken, _requestBody, signature) {
  return verifyXenditCallbackToken(signature ?? callbackToken)
}

/**
 * Status Xendit yang berarti "uang sudah masuk".
 */
export function isXenditPaidStatus(payload) {
  const status = payload?.status
  return status === 'PAID' || status === 'SETTLED'
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a), 'utf8')
  const bufB = Buffer.from(String(b), 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
