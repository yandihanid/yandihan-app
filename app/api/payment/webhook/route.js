// Endpoint lama (era Midtrans) yang dulu dipakai sebagai webhook pembayaran.
// Isinya sekarang hanya meneruskan ke handler Xendit yang sebenarnya supaya
// tidak ada dua implementasi yang bisa berbeda perilaku.
//
// URL yang seharusnya didaftarkan di Dashboard Xendit:
//   Settings > Webhooks > Invoice -> https://<domain>/api/payment/xendit/callback
import { POST as xenditCallback } from '../xendit/callback/route'

export const POST = xenditCallback
