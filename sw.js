// ============================================================
// SERVICE WORKER — Math Race
// Estrategia: Cache-first para assets, Network-first para nada
// ============================================================

const CACHE_NAME = 'math-race-v7';

// Recursos a pre-cachear en la instalación
const PRECACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/errorBanner.js',
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
  './css/fuentes.css',

  // Tipografías: sólo los subconjuntos latinos, que es lo que el castellano
  // necesita. Sin esto el juego se abría con la letra del sistema la primera
  // vez que se usaba sin internet — no da error, simplemente se ve distinto de
  // como el docente lo mostró en clase, y no hay forma de saber por qué.
  './fonts/baloo-2-400-latin.woff2',
  './fonts/baloo-2-700-latin.woff2',
  './fonts/baloo-2-800-latin.woff2',
  './fonts/nunito-400-latin.woff2',
  './fonts/nunito-700-latin.woff2',
  './fonts/nunito-800-latin.woff2',
  './fonts/nunito-900-latin.woff2',

  // Tone.js viaja con el juego desde que se sacaron los recursos de terceros.
  // Se cargaba a demanda y sin precachear, así que la primera vez que hacía
  // falta música sin internet salía «necesita internet la primera vez» — para
  // un archivo que está en el mismo servidor del que salió el juego.
  './vendor/Tone.js',
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
        // Cualquier otra cosa que no esté guardada: respuesta vacía en vez de
        // un error de red, que el navegador muestra como pantalla rota.
        return new Response('', { status: 503 });
      });
    })
  );
});
