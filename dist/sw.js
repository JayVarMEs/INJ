const CACHE_NAME = 'injustice-team-vault-pictures-v1';

const CORE_FILES = [
  './',
  './index.html',
  './assets/image-map.js',
  './assets/roster.js'
];

const PICTURE_FILES = [
  ...Array.from({ length: 144 }, (_, i) => `./assets/characters/c${i}.webp`),
  ...Array.from({ length: 68 }, (_, i) => `./assets/cards/${i < 36 ? 'c' : 'g'}${i < 36 ? i : i - 36}.webp`)
];

async function cacheFiles(files) {
  const cache = await caches.open(CACHE_NAME);
  let next = 0;
  const workers = Array.from({ length: 8 }, async () => {
    while (next < files.length) {
      const file = files[next++];
      try {
        await cache.add(new Request(file, { cache: 'reload' }));
      } catch (error) {
        console.warn('Could not cache', file, error);
      }
    }
  });
  await Promise.all(workers);
}

self.addEventListener('install', event => {
  event.waitUntil(cacheFiles([...CORE_FILES, ...PICTURE_FILES]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('injustice-team-vault-pictures-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', response.clone());
        }
        return response;
      } catch {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  })());
});
