import { NextResponse } from 'next/server'
import {
  readCashierToken,
  readDeviceId,
  resolveCashier,
  tokenBucket,
} from '@/lib/cashierAuth'
import { checkRateLimit, tooManyRequests, clientIp } from '@/lib/rateLimit'

// Perubahan dari versi sebelumnya:
//   * token dibaca dari header x-cashier-token, bukan `?token=` (query string
//     bocor lewat Referer, log proxy, dan cache key service worker)
//   * ada rate limit -- sebelumnya token bisa di-brute-force tanpa batas
//   * select menyertakan require_sub_product, require_customer_name, dan
//     waiting_list_enabled. Tanpa itu tiga toggle di halaman settings tidak
//     pernah berefek apa pun (temuan B8)
//   * device binding tidak bisa lagi dilewati dengan menghilangkan deviceId
//   * .single() -> .maybeSingle() supaya token tak dikenal bukan error 500

const STORE_FIELDS =
  'id, name, subscription_tier, subscription_end_date, receipt_required, ' +
  'require_sub_product, require_customer_name, waiting_list_enabled, ' +
  'pelanggan_enabled, visit_threshold, discount_percent'

const NO_STORE = { 'cache-control': 'private, no-store' }

export async function GET(req) {
  const token = readCashierToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Token kasir diperlukan' }, { status: 400, headers: NO_STORE })
  }

  // Dua lapis: per token (klien sah yang terlalu sering refresh) dan per IP
  // (penebak token, yang setiap percobaannya memakai token berbeda).
  const perToken = await checkRateLimit(tokenBucket('cashier:token', token), {
    limit: 60,
    windowSeconds: 60,
  })
  if (!perToken.allowed) return tooManyRequests(perToken.retryAfter)

  const perIp = await checkRateLimit(`cashier:ip:${clientIp(req)}`, {
    limit: 30,
    windowSeconds: 60,
  })
  if (!perIp.allowed) return tooManyRequests(perIp.retryAfter)

  const { cashier, supabase } = await resolveCashier(
    token,
    `id, name, store_id, device_id, stores!inner(${STORE_FIELDS})`
  )

  if (!cashier) {
    return NextResponse.json({ error: 'Link kasir tidak valid' }, { status: 404, headers: NO_STORE })
  }

  const deviceId = readDeviceId(req)

  // Perangkat sudah terikat: apa pun yang tidak cocok ditolak -- termasuk
  // request yang sama sekali tidak mengirim deviceId. Dulu `if (deviceId)`
  // membuat binding bisa dilewati hanya dengan menghapus parameternya.
  if (cashier.device_id && cashier.device_id !== deviceId) {
    return NextResponse.json(
      { error: 'Link kasir ini sudah dipakai di perangkat lain. Minta pemilik toko mereset token.' },
      { status: 403, headers: NO_STORE }
    )
  }

  if (!cashier.device_id && deviceId) {
    await supabase.from('cashiers').update({ device_id: deviceId }).eq('id', cashier.id)
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock')
    .eq('store_id', cashier.store_id)
    .order('name', { ascending: true })

  // device_id tidak perlu dikirim balik ke browser, dan token memang tidak
  // pernah ada di select ini.
  return NextResponse.json(
    {
      id: cashier.id,
      name: cashier.name,
      store_id: cashier.store_id,
      stores: cashier.stores,
      products: products || [],
    },
    { headers: NO_STORE }
  )
}
