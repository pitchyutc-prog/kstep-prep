const VERSION = 'kstep-v4';
const SHELL = ['./', './index.html', './manifest.json', './questions.json', './icon.svg'];

const API_HOSTS = ['script.google.com', 'script.googleusercontent.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (API_HOSTS.includes(url.hostname)) return;
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (req.headers.has('range')) return;
  if (req.mode === 'navigate') e.respondWith(networkFirst(req, true));
  else if (url.pathname.endsWith('.json')) e.respondWith(networkFirst(req, false));
  else e.respondWith(cacheFirst(req));
});

async function networkFirst(req, isPage) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (isPage) return (await cache.match('./index.html')) || Response.error();
    return Response.error();
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') (await caches.open(VERSION)).put(req, res.clone());
    return res;
  } catch (err) {
    return Response.error();
  }
}
