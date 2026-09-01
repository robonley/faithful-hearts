const SHELL_CACHE = 'faithful-hearts-shell-v3';
const CONTENT_CACHE = 'faithful-hearts-content-v1';
const CORE_ASSETS = [
  './index.html',
  './volume_one.html',
  './app.css',
  './app.js',
  './reader.js',
  './catalog.json',
  './manifest.webmanifest',
  './icon_192.png',
  './icon_512.png',
  './icon_maskable_512.png',
  './apple_touch_icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('faithful-hearts-shell-') && key !== SHELL_CACHE)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CONTENT_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const shellCached = await caches.match(request, { ignoreSearch: true });
    if (shellCached) return shellCached;
    if (request.mode === 'navigate') return caches.match('./index.html');
    throw new Error('Offline and not cached');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CONTENT_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isContent = request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.json');
  event.respondWith(isContent ? networkFirst(request) : cacheFirst(request));
});
