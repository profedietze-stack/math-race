// ============================================================
// SERVICE WORKER — Math Race
// Estrategia: Cache-first para assets, Network-first para nada
// ============================================================

const CACHE_NAME = 'math-race-v3';

// Recursos a pre-cachear en la instalación
const PRECACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/utils.js',
  './js/data.js',
  './js/profiles.js',
  './js/state.js',
  './js/navigation.js',
  './js/stickers.js',
  './js/race-track.js',
  './js/challenge.js',
  './js/actions.js',
  './js/results.js',
  './js/comments.js',
  './js/audio.js',
  './js/main.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&family=Baloo+2:wght@400;700;800&display=swap',
];

// ── Install: pre-cachear el juego completo ──────────────────
// OJO: sin self.skipWaiting() acá a propósito. Un SW nuevo se queda
// "esperando" mientras el viejo sigue sirviendo la pestaña abierta; recién
// toma control cuando el usuario confirma la actualización (ver index.html:
// notifyUpdateAvailable) y le mandamos el mensaje 'skipWaiting'. Así evitamos
// que alguien juegue con HTML/JS mezclado de dos versiones distintas.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
});

// ── Mensaje del cliente: activar la versión nueva ya mismo ──
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

// ── Activate: limpiar caches viejos ────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-first para todo ───────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Solo interceptar GET
  if (event.request.method !== 'GET') return;

  // Ignorar requests de chrome-extension y similares
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // No en caché: fetch y guardar
      return fetch(event.request).then(response => {
        // Solo cachear respuestas válidas
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, cloned);
        });

        return response;
      }).catch(() => {
        // Sin red y sin caché: para HTML, devolver index.html cacheado
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
        // Para fuentes / Tone.js CDN: respuesta vacía (el juego sigue jugable)
        return new Response('', { status: 503 });
      });
    })
  );
});
