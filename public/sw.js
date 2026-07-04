const CACHE_NAME = 'yandihan-cashier-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
];

// Install Service Worker and cache basic assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Hanya tangani request GET untuk halaman kasir dan API kasir
  if (request.method === 'GET') {
    // Strategi Network-First, Fallback-to-Cache untuk halaman kasir (/c/[token]) dan API kasir (/api/cashier)
    if (url.pathname.startsWith('/c/') || url.pathname.startsWith('/api/cashier')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Simpan response terbaru ke cache jika request berhasil
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Jika offline / gagal koneksi, ambil dari cache
            return caches.match(request);
          })
      );
      return;
    }

    // Strategi Cache-First untuk aset statis (JS, CSS, Images, Fonts)
    if (
      url.pathname.startsWith('/_next/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.jpeg') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico')
    ) {
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
      );
      return;
    }
  }
});
