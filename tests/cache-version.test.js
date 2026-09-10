'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  leerCacheName, leerPrecache, aRutaDeDisco,
  calcularHuella, leerSello,
} = require('./helpers/precache-hash');

// Si cambia un archivo precacheado y nadie sube el nombre de la caché, el
// arreglo no le llega a nadie.
//
// El service worker de este juego es cache-first a propósito: sirve todo desde
// su caché y sólo cambia de versión cuando el nombre de la caché cambia y el
// jugador confirma la actualización. Es una buena decisión —evita que alguien
// juegue con HTML y JS mezclados de dos versiones— pero deja el arreglo colgado
// de que alguien se acuerde de subir un número a mano.
//
// No se acordó. El commit `ea02b02`, que arregló el barajado del modo normal
// (las respuestas salían casi en el mismo orden), tocó js/utils.js y dejó
// CACHE_NAME en math-race-v4. Ese arreglo no le llegó a ninguna tablet con el
// juego instalado hasta que un commit posterior subió el número por otra razón.
//
// Este test cierra el agujero: si cambia el contenido precacheado, el nombre de
// la caché tiene que haber cambiado también.

test('el sello de la caché existe', () => {
  const sello = leerSello();
  assert.ok(sello, 'falta sw-precache.json — correr: node tests/sellar-cache.js');
  assert.ok(sello.cacheName, 'el sello no dice a qué caché corresponde');
  assert.ok(sello.huella, 'el sello no tiene huella');
});

test('si cambió algo precacheado, cambió el nombre de la caché', () => {
  const sello = leerSello();
  const huellaHoy = calcularHuella();
  const cacheHoy = leerCacheName();

  if (huellaHoy === sello.huella) {
    // Nada cambió: el nombre tiene que seguir siendo el mismo.
    assert.equal(
      cacheHoy, sello.cacheName,
      'cambió el nombre de la caché sin que cambiara nada precacheado — ' +
      'si es a propósito, correr: node tests/sellar-cache.js',
    );
    return;
  }

  assert.notEqual(
    cacheHoy, sello.cacheName,
    `cambió un archivo precacheado y CACHE_NAME sigue en "${cacheHoy}". ` +
    'Quien ya tenga el juego instalado se queda con la versión vieja para ' +
    'siempre. Subir CACHE_NAME y después correr: node tests/sellar-cache.js',
  );
  assert.fail(
    `CACHE_NAME ya está en "${cacheHoy}", falta re-sellar: node tests/sellar-cache.js`,
  );
});

test('todo lo que el service worker precachea existe en el disco', () => {
  // `cache.addAll` es todo o nada: un solo 404 rechaza la instalación entera y
  // el juego queda sin caché ninguna, ni siquiera de los archivos que sí están.
  const faltan = leerPrecache().filter(e => !fs.existsSync(aRutaDeDisco(e)));
  assert.deepEqual(faltan, [], `PRECACHE nombra archivos que no existen: ${faltan.join(', ')}`);
});

test('cada <script src> del index está precacheado', () => {
  // Un archivo js nuevo que se agrega al index y se olvida acá deja el juego
  // sin arrancar cuando no hay internet.
  const html = fs.readFileSync(require('./helpers/precache-hash').RAIZ + '/index.html', 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
  const precache = leerPrecache().map(e => e.replace(/^\.?\//, ''));
  const faltan = scripts
    .filter(s => !/^https?:/.test(s))
    .map(s => s.replace(/^\.?\//, ''))
    .filter(s => !precache.includes(s));
  assert.deepEqual(faltan, [], `estos scripts del index no están en PRECACHE: ${faltan.join(', ')}`);
});

test('y cada <link rel=stylesheet> también', () => {
  const html = fs.readFileSync(require('./helpers/precache-hash').RAIZ + '/index.html', 'utf8');
  const hojas = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(m => m[1]);
  const precache = leerPrecache().map(e => e.replace(/^\.?\//, ''));
  const faltan = hojas
    .filter(h => !/^https?:/.test(h))
    .map(h => h.replace(/^\.?\//, ''))
    .filter(h => !precache.includes(h));
  assert.deepEqual(faltan, [], `estas hojas de estilo no están en PRECACHE: ${faltan.join(', ')}`);
});
