/*
 * IPI Worship — Service Worker
 * Basic offline support so a dropped connection during a service doesn't
 * blank the app. Hand-written (no build tooling) to stay compatible with
 * Next.js 16 + Turbopack.
 *
 * Strategies:
 *   • Navigations (HTML)      → network-first, fall back to cached page, then app shell.
 *   • Static assets (_next…)  → stale-while-revalidate.
 *   • Supabase GET (data)     → stale-while-revalidate, so already-visited
 *                               songs/playlists still load offline.
 *   • Everything non-GET      → passes straight through (never cached).
 */
const VERSION = 'v1';
const SHELL_CACHE = `ipi-shell-${VERSION}`;
const ASSET_CACHE = `ipi-assets-${VERSION}`;
const DATA_CACHE = `ipi-data-${VERSION}`;
const ALL_CACHES = [SHELL_CACHE, ASSET_CACHE, DATA_CACHE];

// Minimal offline fallback for when even the app shell isn't cached yet.
const OFFLINE_HTML = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sem conexão — IPI do Imirim</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center;padding:24px}
.c{max-width:320px}.d{width:56px;height:56px;border-radius:16px;background:#00B0EF;margin:0 auto 16px;
display:flex;align-items:center;justify-content:center;font-size:28px}h1{font-size:18px;margin:0 0 8px}
p{font-size:14px;color:#94a3b8;line-height:1.5;margin:0}</style></head>
<body><div class="c"><div class="d">♪</div><h1>Você está offline</h1>
<p>As músicas que você já abriu continuam disponíveis. Reconecte para ver o restante do repertório.</p></div></body></html>`;

self.addEventListener('install', (event) => {
  // Pre-cache the app entry so the very first offline navigation has something.
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(['/'])).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isSupabaseData(url) {
  return url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/');
}

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never cache writes/auth

  const url = new URL(request.url);

  // Supabase data reads → stale-while-revalidate (offline access to visited songs).
  if (isSupabaseData(url)) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }

  // Same-origin only beyond this point (skip Google fonts/avatars etc.).
  if (url.origin !== self.location.origin) return;

  // Next.js build assets and icons → stale-while-revalidate.
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  // Page navigations → network-first, fall back to cache, then app shell, then offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match('/');
          if (shell) return shell;
          return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        })
    );
  }
});
