/* ═══════════════════════════════════════════════════════════
   SERVICE WORKER — SapaTamu PWA Offline Mode
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'sapatamu-pwa-v2';
const CACHE_VERSION = '2.0.0';

// Files to cache on install (lokal saja — CDN tidak di-cache untuk hindari supply chain risk)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './formulir_tamu.html',
  './checkin.html',
  './onsite.html',
  './welcome.html',
  './sortir.html',
  './offline-db.js',
  './sync-engine.js',
  './animations.css',
  './subdomain_resolver.js',
  './config.js',
  './manifest.json'
];

// ── INSTALL: Cache all static assets ──
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to cache:', err);
        // Cache individually, skip failures
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) => cache.add(url).catch(() => null))
        );
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: Clean old caches ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ── FETCH: Cache-first strategy ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase & external API calls (always go to network)
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('script.google.com') ||
      url.hostname.includes('api.qrserver.com') ||
      url.hostname.includes('googleapis.com/css') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for local assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached, but also update cache in background
        event.waitUntil(
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => null)
        );
        return cachedResponse;
      }

      // Not in cache → fetch from network
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline and not in cache → return offline page
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./formulir_tamu.html');
        }
      });
    })
  );
});

// ── MESSAGE: Handle cache updates from pages ──
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CACHE_IMAGES') {
    // SECURITY: Validate origin — hanya terima dari sapatamu.id
    const origin = event.origin || event.source?.origin;
    const ALLOWED_ORIGINS = ['https://sapatamu.id', 'https://www.sapatamu.id', 'http://localhost:3000', 'http://localhost:8080'];
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn('[SW] CACHE_IMAGES rejected from untrusted origin:', origin);
      return;
    }

    const { urls } = event.data;
    if (!Array.isArray(urls)) return;

    // SECURITY: Limit jumlah URLs yang bisa di-cache sekaligus
    const MAX_CACHE_LIMIT = 50;
    const safeUrls = urls.slice(0, MAX_CACHE_LIMIT);

    // SECURITY: Hanya cache URLs dari domain yang diizinkan
    const ALLOWED_CACHE_HOSTS = ['supabase.co', 'sapatamu.id', 'googleapis.com', 'gstatic.com', 'img.youtube.com'];
    
    caches.open(CACHE_NAME).then((cache) => {
      safeUrls.forEach((url) => {
        try {
          const urlObj = new URL(url);
          const isAllowed = ALLOWED_CACHE_HOSTS.some(host => urlObj.hostname.includes(host));
          if (!isAllowed) {
            console.warn('[SW] Blocked caching untrusted URL:', url);
            return;
          }
          fetch(url).then((response) => {
            if (response.ok) cache.put(url, response);
          }).catch(() => null);
        } catch (e) {
          console.warn('[SW] Invalid URL skipped:', url);
        }
      });
    });
  }
});

// ── SYNC: Background sync when online ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-guests') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_SYNC' });
        });
      })
    );
  }
});

// ── NOTIFICATION: Push notifications ──
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'SapaTamu';
  const body = data.body || 'Ada pembaruan data';
  const icon = 'icon-192.png';

  event.waitUntil(
    self.registration.showNotification(title, {
      body, icon, badge: icon,
      vibrate: [100, 50, 100]
    })
  );
});
