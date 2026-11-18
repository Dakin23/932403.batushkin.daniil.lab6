const VERSION = 'v5';
const STATIC_CACHE = `cinema-static-${VERSION}`;
const DATA_CACHE = `cinema-data-${VERSION}`;

const ASSETS = [
  '/',
  '/about',
  '/offline.html',
  '/css/style.css',
  '/js/register-sw.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-64.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const staticCache = await caches.open(STATIC_CACHE);
    await staticCache.addAll(ASSETS);

    const dataCache = await caches.open(DATA_CACHE);
    try {
      const resp = await fetch('/api/movies');
      if (resp.ok) await dataCache.put('/api/movies', resp.clone());
    } catch (e) {
      console.warn('API при установке недоступен — обошлись без предзагрузки данных');
    }

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  const keep = [STATIC_CACHE, DATA_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === '/api/movies') {
    event.respondWith(moviesNetworkFirst(url));
    return;
  }

  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          }
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/offline.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
      if (resp.ok && resp.type === 'basic') {
        const copy = resp.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
      }
      return resp;
    }))
  );
});

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders }
  });
}

async function moviesNetworkFirst(url) {
  const cache = await caches.open(DATA_CACHE);

  try {
    const resp = await fetch(url.href);

    if (resp.ok && !url.searchParams.has('minRating')) {
      await cache.put('/api/movies', resp.clone());
    }
    return resp;
  } catch (err) {
    const values = url.searchParams.getAll('minRating');

    if (values.length > 1) {
      return jsonResponse({ error: 'minRating должен быть указан один раз' }, 400);
    }

    const base = await cache.match('/api/movies');
    if (!base) {
      return jsonResponse({ error: 'Офлайн: данных в кеше нет' }, 503);
    }

    const all = await base.json();
    let data = all;

    if (values.length === 1) {
      const str = values[0].trim().replace(',', '.');
      if (str === '') {
        return jsonResponse({ error: 'minRating не может быть пустым' }, 400);
      }
      const min = Number(str);
      if (!Number.isFinite(min)) {
        return jsonResponse({ error: 'minRating должен быть числом', received: values[0] }, 400);
      }
      if (min < 0 || min > 10) {
        return jsonResponse({ error: 'minRating должен быть в диапазоне 0..10', received: values[0] }, 400);
      }
      data = all.filter((m) => m.rating >= min);
    }

    return jsonResponse(data, 200, { 'X-Offline': '1' });
  }
}
