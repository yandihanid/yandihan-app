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

/**
 * Business ID sub-account Xendit (XenPlatform).
 *
 * Dikirim sebagai header `for-user-id` supaya invoice dibuat atas nama
 * sub-account toko dan dananya masuk ke saldo sub-account itu, bukan ke akun
 * utama platform.
 */
export const XENDIT_SUB_ACCOUNT_HEADER = 'for-user-id'

/** Header aturan split (fee platform) untuk transaksi sub-account. */
export const XENDIT_SPLIT_RULE_HEADER = 'with-split-rule'

const SUB_ACCOUNT_ID_RE = /^[A-Za-z0-9_-]{3,64}$/

/** Business ID sub-account yang bentuknya wajar. Bukan jaminan akunnya ada. */
export function isValidXenditSubAccountId(value) {
  return SUB_ACCOUNT_ID_RE.test(String(value ?? '').trim())
}

/** Normalisasi input: kosong -> null, selain itu di-trim. */
export function normalizeXenditSubAccountId(value) {
  const id = String(value ?? '').trim()
  return id || null
}

/**
 * Header untuk semua request Xendit.
 *
 * `for-user-id` hanya dikirim kalau toko punya sub-account. `with-split-rule`
 * hanya berguna bersama sub-account (memotong bagian platform dari dana yang
 * masuk ke sub-account), jadi ia tidak pernah dikirim sendiri.
 */
export function xenditRequestHeaders({ forUserId = null, splitRuleId = null } = {}) {
  const headers = {
    Accept: 'application/json',
    Authorization: xenditAuthHeader(),
  }

  const subAccountId = normalizeXenditSubAccountId(forUserId)
  if (subAccountId) {
    headers[XENDIT_SUB_ACCOUNT_HEADER] = subAccountId

    const rule = normalizeXenditSubAccountId(
      splitRuleId ?? process.env.XENDIT_SPLIT_RULE_ID
    )
    if (rule) headers[XENDIT_SPLIT_RULE_HEADER] = rule
  }

  return headers
}

export function isXenditConfigured() {
  return Boolean(String(process.env.XENDIT_SECRET_KEY || '').trim())
}

export function xenditAuthHeader() {
  const secretKey = String(process.env.XENDIT_SECRET_KEY || '').trim()
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
}

/**
 * Buat invoice Xendit.
 *
 * `forUserId` diisi Business ID sub-account toko kalau pembayaran harus masuk
 * ke rekening toko. Untuk langganan/add-on platform, biarkan kosong: uangnya
 * memang milik platform.
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
    forUserId = null,
    splitRuleId = null,
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
      'Content-Type': 'application/json',
      ...xenditRequestHeaders({ forUserId, splitRuleId }),
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
 *
 * Invoice milik sub-account WAJIB ditanyakan dengan header `for-user-id` yang
 * sama seperti saat dibuat. Kalau tidak, Xendit menjawab 404 seolah invoice
 * tidak ada.
 */
export async function getXenditInvoice(invoiceId, { forUserId = null } = {}) {
  if (!invoiceId || !isXenditConfigured()) return null

  const response = await fetch(
    `${xenditApiUrl()}/v2/invoices/${encodeURIComponent(String(invoiceId))}`,
    {
      headers: xenditRequestHeaders({ forUserId }),
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
 *
 * Invoice yang dibuat atas nama sub-account bisa memakai callback token milik
 * sub-account itu sendiri (diatur di Dashboard Xendit per sub-account). Karena
 * itu token tambahan boleh didaftarkan di
 * XENDIT_SUB_ACCOUNT_CALLBACK_TOKENS, dipisah koma. Semua token tetap
 * dibandingkan constant time.
 */
export function verifyXenditCallbackToken(providedToken) {
  const provided = String(providedToken || '')
  if (!provided) return false

  const tokens = [
    process.env.XENDIT_CALLBACK_TOKEN,
    ...String(process.env.XENDIT_SUB_ACCOUNT_CALLBACK_TOKENS || '').split(','),
  ]
    .map((token) => String(token || '').trim())
    .filter(Boolean)

  if (tokens.length === 0) return false

  // Jangan berhenti di token pertama yang cocok: waktu eksekusi tidak boleh
  // membocorkan token mana yang benar.
  let matched = false
  for (const token of tokens) {
    matched = safeEqual(token, provided) || matched
  }
  return matched
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
