'use strict';
// Calcula una huella del contenido que el service worker precachea.
//
// Sirve para una sola cosa: detectar que cambió un archivo precacheado sin que
// nadie subiera el nombre de la caché. Cuando eso pasa, el arreglo no le llega
// a quien ya tiene el juego instalado — el service worker le sigue sirviendo la
// versión vieja de su caché, para siempre.
//
// Ya pasó una vez en este repo: el commit que arregló el barajado del modo
// normal (`ea02b02`) tocó js/utils.js y dejó CACHE_NAME donde estaba.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RAIZ = path.join(__dirname, '..', '..');
const SW = path.join(RAIZ, 'sw.js');
const SELLO = path.join(RAIZ, 'sw-precache.json');

/** El nombre de caché declarado hoy en sw.js. */
function leerCacheName() {
  const sw = fs.readFileSync(SW, 'utf8');
  const m = sw.match(/const\s+CACHE_NAME\s*=\s*'([^']+)'/);
  if (!m) throw new Error('no se encontró CACHE_NAME en sw.js');
  return m[1];
}

/** Las rutas de la lista PRECACHE, tal como están escritas. */
function leerPrecache() {
  const sw = fs.readFileSync(SW, 'utf8');
  const bloque = sw.match(/const\s+PRECACHE\s*=\s*\[([\s\S]*?)\];/);
  if (!bloque) throw new Error('no se encontró PRECACHE en sw.js');
  return [...bloque[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
}

/** Ruta en disco de una entrada de PRECACHE. `'./'` es index.html. */
function aRutaDeDisco(entrada) {
  const limpia = entrada.replace(/^\.?\//, '');
  return path.join(RAIZ, limpia === '' ? 'index.html' : limpia);
}

/**
 * Huella del contenido precacheado.
 *
 * Entra la lista de rutas (para que agregar o sacar un archivo también cuente)
 * y el contenido de cada una. Un archivo que falta se marca como tal en vez de
 * romper: de eso se ocupa su propio test.
 */
function calcularHuella() {
  const h = crypto.createHash('sha256');
  for (const entrada of leerPrecache()) {
    h.update(entrada);
    h.update('\0');
    const ruta = aRutaDeDisco(entrada);
    h.update(fs.existsSync(ruta) ? fs.readFileSync(ruta) : Buffer.from('FALTA'));
    h.update('\0');
  }
  return h.digest('hex').slice(0, 16);
}

function leerSello() {
  if (!fs.existsSync(SELLO)) return null;
  try {
    return JSON.parse(fs.readFileSync(SELLO, 'utf8'));
  } catch (e) {
    return null;
  }
}

function escribirSello() {
  const sello = { cacheName: leerCacheName(), huella: calcularHuella() };
  fs.writeFileSync(SELLO, JSON.stringify(sello, null, 2) + '\n', 'utf8');
  return sello;
}

module.exports = {
  RAIZ, SW, SELLO,
  leerCacheName, leerPrecache, aRutaDeDisco,
  calcularHuella, leerSello, escribirSello,
};
