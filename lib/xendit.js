// Satu tempat untuk semua urusan Xendit.
import 'server-only'
import { timingSafeEqual } from 'node:crypto'

export function isXenditProduction() {
  return String(process.env.XENDIT_IS_PRODUCTION).toLowerCase() === 'true'
}

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
 * Header untuk semua request Xendit.
 *
 * Tidak ada `for-user-id` lagi. Sub-account (XenPlatform) tidak dipakai:
 * pengajuannya tidak disetujui, dan sekarang seluruh uang masuk ke satu
 * akun Xendit milik platform. Pemisahan per toko dilakukan di sisi aplikasi
 * (lihat lib/storePayout.js): pendapatan tiap toko dicatat terpisah dan
 * dicairkan lewat API Disbursement.
 */
export function xenditRequestHeaders() {
  return {
    Accept: 'application/json',
    Authorization: xenditAuthHeader(),
  }
}

/**
 * Buat invoice Xendit.
 *
 * Invoice selalu dibuat atas nama akun platform. Uang pelanggan masuk ke
 * saldo akun itu, lalu dibagikan ke toko melalui pencairan (disbursement).
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
  // diatur di Dashboard (Settings > Webhooks > Invoice).

  const response = await fetch(`${xenditApiUrl()}/v2/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...xenditRequestHeaders(),
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
      headers: xenditRequestHeaders(),
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

/**
 * Kirim pencairan (disbursement) dari saldo platform ke rekening toko.
 *
 * Ini yang menggantikan sub-account: uang tetap di satu akun Xendit, lalu
 * dikirim per toko ke rekening bank yang didaftarkan toko itu.
 *
 * `external_id` adalah kunci idempotensi. Xendit menolak permintaan dengan
 * external_id yang sama, jadi percobaan ulang tidak pernah menghasilkan
 * dua pencairan untuk satu toko.
 */
export async function createXenditDisbursement(params) {
  const {
    externalId,
    reference,
    amount,
    bankCode,
    accountNumber,
    accountHolderName,
    description,
    email,
  } = params

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

  const payload = {
    external_id: externalId,
    reference,
    amount,
    bank_code: bankCode,
    // Xendit punya dua kode untuk satu bank: `bank_code` (mis. "BCA") dan
    // `channel_code` yang memakai awalan negara (mis. "ID_BCA"). Yang kedua
    // wajib diisi supaya pencairan diproses lewat kanal bank yang benar.
    channel_code: bankCode.startsWith('ID_') ? bankCode : `ID_${bankCode}`,
    account_holder_name: accountHolderName,
    account_number: accountNumber,
    description,
  }
  if (email) payload.email = email

  const response = await fetch(`${xenditApiUrl()}/disbursements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...xenditRequestHeaders(),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  return response
}

/**
 * Ambil status satu pencairan dari Xendit. Dipakai untuk rekonsiliasi: kalau
 * webhook tidak sampai, status pencairan tetap bisa dicek manual.
 * Mengembalikan null kalau tidak ditemukan atau API menolak.
 */
export async function getXenditDisbursement(disbursementId) {
  if (!disbursementId || !isXenditConfigured()) return null

  const response = await fetch(
    `${xenditApiUrl()}/disbursements/${encodeURIComponent(String(disbursementId))}`,
    {
      headers: xenditRequestHeaders(),
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
  const provided = String(providedToken || '')
  if (!provided) return false

  const token = String(process.env.XENDIT_CALLBACK_TOKEN || '').trim()
  if (!token) return false

  return safeEqual(token, provided)
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

/**
 * Status pencairan Xendit.
 *
 * DISBURSED = uang sudah sampai di rekening tujuan. FAILED = ditolak (mis.
 * rekening tujuan salah). PENDING = sedang diproses bank.
 */
export function isXenditDisbursedStatus(payload) {
  return payload?.status === 'DISBURSED'
}

export function isXenditDisbursementFailedStatus(payload) {
  return payload?.status === 'FAILED'
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a), 'utf8')
  const bufB = Buffer.from(String(b), 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
