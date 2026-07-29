/* ═══════════════════════════════════════════════════════════
   SERVICE WORKER — SapaTamu PWA Offline Mode
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'sapatamu-pwa-v1';
const CACHE_VERSION = '1.0.0';

// Files to cache on install
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
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'
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
    const { urls } = event.data;
    caches.open(CACHE_NAME).then((cache) => {
      urls.forEach((url) => {
        fetch(url).then((response) => {
          if (response.ok) cache.put(url, response);
        }).catch(() => null);
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
