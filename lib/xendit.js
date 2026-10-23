// Satu tempat untuk semua urusan Xendit.
import 'server-only'

export function isXenditProduction() {
  return String(process.env.XENDIT_IS_PRODUCTION).toLowerCase() === 'true'
}

export function xenditApiUrl() {
  return isXenditProduction()
    ? 'https://api.xendit.co'
    : 'https://api.xendit.co'
}

export function xenditAuthHeader() {
  const secretKey = process.env.XENDIT_SECRET_KEY || ''
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
    callbackUrl,
  } = params

  const response = await fetch(`${xenditApiUrl()}/v2/invoices`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: xenditAuthHeader(),
    },
    body: JSON.stringify({
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
      callback_virtual_account_url: callbackUrl,
      fees: [],
    }),
  })

  return response
}

/**
 * Verifikasi signature Xendit callback.
 * signature = SHA-256(callback_token + request_body)
 */
export async function verifyXenditSignature(callbackToken, requestBody, signature) {
  if (!callbackToken || !signature) return false

  const crypto = await import('node:crypto')
  const expected = crypto
    .createHmac('sha256', callbackToken)
    .update(JSON.stringify(requestBody))
    .digest('hex')

  return timingSafeEqualHex(expected, String(signature))
}

/**
 * Status Xendit yang berarti "uang sudah masuk".
 */
export function isXenditPaidStatus({ status }) {
  return status === 'PAID' || status === 'SETTLED'
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}