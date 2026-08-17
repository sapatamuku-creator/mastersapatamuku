/* ═══════════════════════════════════════════════════════════
   SERVICE WORKER — SapaTamu PWA Offline Mode
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'sapatamu-pwa-v5';
const CACHE_VERSION = '4.1.0';

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
        // Cache individually, log failures explicitly
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) => cache.add(url).catch((itemErr) => {
            console.warn('[SW] Failed to precache asset:', url, itemErr);
            return null;
          }))
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

  // Skip non-http/https requests (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // Skip cross-origin requests (Google Drive, Googleusercontent, Supabase, CDNs)
  // Biarkan browser memuatnya secara native via pipeline img-src tanpa interupsi Service Worker
  if (url.origin !== self.location.origin) {
    return;
  }

  // HTML navigation → network-first, agar update kode langsung tampil
  // (fallback ke cache hanya saat offline, bukan saat online)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() =>
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return caches.match('./formulir_tamu.html');
        }).then((offlinePage) => {
          if (offlinePage) return offlinePage;
          return new Response(
            '<!DOCTYPE html><html><head><title>Offline</title></head><body style="text-align:center;padding:50px;font-family:sans-serif;"><h2>Mode Offline</h2><p>Koneksi internet Anda terputus. Silakan hubungkan kembali perangkat Anda.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
      )
    );
    return;
  }

  // Cache-first for local assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached, but also update cache in background (only for same-origin)
        if (url.origin === self.location.origin) {
          event.waitUntil(
            fetch(request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            }).catch(() => null)
          );
        }
        return cachedResponse;
      }

      // Not in cache → fetch from network
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline and not in cache → return cached offline page or generic offline HTML
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./formulir_tamu.html').then((offlinePage) => {
            if (offlinePage) return offlinePage;
            return new Response(
              '<!DOCTYPE html><html><head><title>Offline</title></head><body style="text-align:center;padding:50px;font-family:sans-serif;"><h2>Mode Offline</h2><p>Koneksi internet Anda terputus. Silakan hubungkan kembali perangkat Anda.</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
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

// Helper function to sanitize text input for notifications
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  // Strip HTML tags and control characters
  return str.replace(/<[^>]*>/g, '').replace(/[\r\n\t]/g, ' ').trim();
}

// ── NOTIFICATION: Push notifications ──
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = sanitizeText(data.title) || 'SapaTamu';
  const body = sanitizeText(data.body) || 'Ada pembaruan data';
  const icon = 'icon-192.png';

  event.waitUntil(
    self.registration.showNotification(title, {
      body, icon, badge: icon,
      vibrate: [100, 50, 100]
    })
  );
});
