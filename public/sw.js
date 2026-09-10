// Cache ini hanya berisi aset publik yang aman. Cache antrean/bukti pembayaran
// (`yandihan-receipts`) dimiliki offlineQueue.js dan tidak disentuh service worker.
const APP_CACHE_PREFIX = 'yandihan-cashier-cache-';
const CACHE_NAME = `${APP_CACHE_PREFIX}v3`;
const CACHE_TIME_HEADER = 'x-yandihan-cached-at';
const MAX_CACHE_ENTRIES = 60;
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PRECACHE_URLS = ['/manifest.json', '/icon-192.png', '/icon-512.png'];

function assetKind(url) {
  if (url.search) return null;
  if (url.pathname === '/manifest.json') return 'manifest';
  if (url.pathname === '/icon-192.png' || url.pathname === '/icon-512.png') return 'icon';
  if (url.pathname.startsWith('/_next/static/')) return 'next-static';
  return null;
}

function isSensitivePath(pathname) {
  const path = pathname.toLowerCase();
  return (
    path === '/api' || path.startsWith('/api/') ||
    path === '/auth' || path.startsWith('/auth/') ||
    path === '/dashboard' || path.startsWith('/dashboard/') ||
    path === '/r' || path.startsWith('/r/') ||
    path === '/receipts' || path.startsWith('/receipts/')
  );
}

function isCashierNavigation(request, url) {
  return request.mode === 'navigate' && /^\/c\/[^/]+\/?$/.test(url.pathname);
}

function cacheKey(url) {
  // Jangan persist query string atau header request (cookie/token) ke Cache API.
  return new Request(`${url.origin}${url.pathname}`, {
    method: 'GET',
    credentials: 'omit',
  });
}

function isSafeAssetResponse(response, kind) {
  if (!(response instanceof Response) || !response.ok || response.status !== 200 || response.type !== 'basic') {
    return false;
  }
  const control = (response.headers.get('cache-control') || '').toLowerCase();
  if (control.includes('no-store') || control.includes('private')) return false;
  const type = (response.headers.get('content-type') || '').toLowerCase();
  if (type.includes('text/html')) return false;
  if (kind === 'manifest') return type.includes('json') || type.includes('manifest');
  if (kind === 'icon') return type.startsWith('image/');
  return true;
}

function stampedResponse(response) {
  const headers = new Headers(response.headers);
  headers.set(CACHE_TIME_HEADER, String(Date.now()));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function cachedAt(response) {
  const value = Number(response && response.headers.get(CACHE_TIME_HEADER));
  return Number.isFinite(value) ? value : 0;
}

async function trimCache(cache) {
  const now = Date.now();
  const records = await Promise.all((await cache.keys()).map(async (request) => {
    const response = await cache.match(request);
    return { request, time: cachedAt(response) };
  }));
  const expired = records.filter(({ time }) => !time || now - time > MAX_CACHE_AGE_MS);
  await Promise.all(expired.map(({ request }) => cache.delete(request)));
  const remaining = records.filter(({ time }) => time && now - time <= MAX_CACHE_AGE_MS);
  remaining.sort((a, b) => a.time - b.time);
  const excess = Math.max(0, remaining.length - MAX_CACHE_ENTRIES);
  await Promise.all(remaining.slice(0, excess).map(({ request }) => cache.delete(request)));
}

async function storeAsset(cache, key, response) {
  await cache.put(key, stampedResponse(response.clone()));
  await trimCache(cache);
}

async function precacheSafeAssets() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(PRECACHE_URLS.map(async (path) => {
    const url = new URL(path, self.location.origin);
    const kind = assetKind(url);
    try {
      const response = await fetch(cacheKey(url));
      if (isSafeAssetResponse(response, kind)) await storeAsset(cache, cacheKey(url), response);
    } catch {
      // Instalasi tetap berhasil saat perangkat sedang offline.
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheSafeAssets().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith(APP_CACHE_PREFIX) && name !== CACHE_NAME)
        .map((name) => caches.delete(name))))
      .then(() => caches.open(CACHE_NAME))
      .then((cache) => trimCache(cache))
      .then(() => self.clients.claim())
  );
});

function offlineAssetResponse() {
  return new Response('Aset tidak tersedia saat offline.', {
    status: 504,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function serveAsset(url, kind) {
  const key = cacheKey(url);
  let cache;
  try {
    cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(key);
    if (cached && cachedAt(cached) && Date.now() - cachedAt(cached) <= MAX_CACHE_AGE_MS) return cached;
    if (cached) await cache.delete(key);
  } catch {
    cache = null;
  }
  try {
    const response = await fetch(key);
    if (cache && isSafeAssetResponse(response, kind)) {
      try {
        await storeAsset(cache, key, response);
      } catch {
        // Respons jaringan tetap valid meskipun Cache API penuh/diblokir.
      }
    }
    return response instanceof Response ? response : offlineAssetResponse();
  } catch {
    return offlineAssetResponse();
  }
}

function offlineCashierPage() {
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'"><title>Kasir Offline</title><style>body{font:16px system-ui,sans-serif;margin:0;background:#f8fafc;color:#0f172a}.box{max-width:34rem;margin:12vh auto;padding:1.5rem}.card{background:#fff;border:1px solid #cbd5e1;border-radius:14px;padding:1.5rem;box-shadow:0 8px 30px #0f172a12}h1{margin:.2rem 0}p{line-height:1.55;color:#475569}button{font:inherit;font-weight:600;padding:.75rem 1rem;border:0;border-radius:9px;background:#0f172a;color:#fff}@media(prefers-color-scheme:dark){body{background:#0f172a;color:#e2e8f0}.card{background:#1e293b;border-color:#334155}p{color:#cbd5e1}button{background:#e2e8f0;color:#0f172a}}</style></head><body><main class="box"><section class="card"><small>Yandihan Kasir</small><h1 id="store">Mode offline</h1><p id="cashier">Halaman kasir tidak dapat dimuat dari jaringan.</p><p id="status">Sambungkan internet setidaknya sekali pada perangkat ini agar data kasir tersedia.</p><button type="button" onclick="location.reload()">Coba lagi</button></section></main><script>(()=>{try{const p=location.pathname.split('/');const token=decodeURIComponent(p[2]||'');const data=JSON.parse(localStorage.getItem('yandihan_cashier_meta_'+token)||'null');if(data&&data.id){document.querySelector('#store').textContent=(data.stores&&data.stores.name)||'Kasir tersimpan';document.querySelector('#cashier').textContent=data.name||'Perangkat kasir';document.querySelector('#status').textContent='Data kasir tersedia di perangkat ini. Muat ulang setelah koneksi kembali untuk membuka aplikasi lengkap.'}}catch{}addEventListener('online',()=>location.reload())})()</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function serveCashierNavigation(request) {
  try {
    const response = await fetch(request);
    return response instanceof Response ? response : offlineCashierPage();
  } catch {
    return offlineCashierPage();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isSensitivePath(url.pathname)) return;
  if (isCashierNavigation(request, url)) {
    event.respondWith(serveCashierNavigation(request));
    return;
  }
  const kind = assetKind(url);
  if (kind) event.respondWith(serveAsset(url, kind));
});
