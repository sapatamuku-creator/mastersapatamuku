/* ═══════════════════════════════════════════════════════════
   SERVICE WORKER — SapaTamu PWA Offline Mode
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'sapatamu-pwa-v18';
const CACHE_VERSION = '5.4.0';

// Files to cache on install (lokal saja — CDN tidak di-cache untuk hindari supply chain risk)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './formulir_tamu.html',
  './checkin.html',
  './onsite.html',
  './souvenir.html',
  './analytics.html',
  './config.html',
  './welcome.html',
  './sortir.html',
  './kiosk.html',
  './offline-db.js',
  './sync-engine.js',
  './lib/guestbook-core.js',
  './lib/jalur-store.js',
  './scripts/printer_widget.js',
  './animations.css',
  './subdomain_resolver.js',
  './config.js',
  './manifest.json',
  './manifest-sortir.json',
  './assets/favicon.png',
  './assets/icon-sortir-192.png',
  './assets/icon-sortir-512.png',
  './assets/icon-guestbook-192.png',
  './assets/icon-guestbook-512.png'
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

// ── FETCH: Network-First strategy (Online First, Offline Fallback to Cache) ──
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

  // Network-First untuk semua aset lokal (HTML, JS, CSS, JSON, images)
  // Saat online: fetch versi terbaru dari server dan update cache
  // Saat offline: fallback ke cache
  event.respondWith(
    fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
      }
      return networkResponse;
    }).catch(() =>
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./formulir_tamu.html').then((offlinePage) => {
            if (offlinePage) return offlinePage;
            return new Response(
              '<!DOCTYPE html><html><head><title>Offline</title></head><body style="text-align:center;padding:50px;font-family:sans-serif;"><h2>Mode Offline</h2><p>Koneksi internet Anda terputus. Silakan hubungkan kembali perangkat Anda.</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
        }
      })
    )
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
