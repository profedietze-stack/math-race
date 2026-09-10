'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { RAIZ, leerPrecache } = require('./helpers/precache-hash');

// Lo que el juego promete cuando se instala.
//
// El juego trae un manifest, se ofrece como aplicación instalable y precachea
// su HTML, su CSS y sus scripts. Pero dos cosas que viajan con el juego
// quedaban fuera de la lista: las tipografías y Tone.js.
//
// El síntoma no es un error, es peor: el juego abre, funciona, y se ve con otra
// letra o suelta un cartel que dice «Sin música (necesita internet la primera
// vez)» — para un archivo que está en el mismo servidor del que salió el juego.
// El docente no tiene forma de saber que eso es la caché y no el juego.

const precache = leerPrecache().map(e => e.replace(/^\.?\//, ''));

test('las tipografías que el CSS pide están precacheadas', () => {
  // `font-display: swap` hace que el texto igual se vea, pero con la letra de
  // sistema: el juego se abre distinto de como el docente lo mostró en clase.
  //
  // Sólo los subconjuntos latinos, que es lo que el castellano necesita — los
  // `-ext` cubren caracteres que este juego no usa y pesan lo mismo.
  const css = fs.readFileSync(path.join(RAIZ, 'css', 'fuentes.css'), 'utf8');
  const pedidas = [...css.matchAll(/url\('\.\.\/([^']+)'\)/g)]
    .map(m => m[1])
    .filter(f => !f.includes('-ext'));

  assert.ok(pedidas.length > 0, 'no se encontró ninguna tipografía en fuentes.css');
  const faltan = pedidas.filter(f => !precache.includes(f));
  assert.deepEqual(faltan, [], `tipografías sin precachear: ${faltan.join(', ')}`);
});

test('Tone.js está precacheado: viaja con el juego, no es un CDN', () => {
  // Se cargaba a demanda y sin caché, así que la primera vez que el juego
  // necesitaba música sin internet mostraba «necesita internet la primera vez».
  // Desde el commit que sacó los recursos de terceros, el archivo está en
  // vendor/ y sale del mismo servidor: no hay ninguna primera vez que necesite
  // internet más que la instalación.
  assert.ok(
    precache.includes('vendor/Tone.js'),
    'vendor/Tone.js no está en PRECACHE — el juego queda mudo sin internet',
  );
});

test('el service worker ya no habla de CDN', () => {
  // El comentario del fetch decía «Para fuentes / Tone.js CDN». Quedó viejo:
  // los recursos de terceros se sacaron y ahora todo es del propio sitio.
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  assert.ok(!/CDN/i.test(sw), 'sw.js todavía menciona un CDN que ya no existe');
});

test('nada de lo precacheado viene de otro dominio', () => {
  // §15: ningún recurso de terceros. Si algo entra a PRECACHE con http, es que
  // volvió a colarse un CDN.
  const externas = leerPrecache().filter(e => /^https?:/.test(e));
  assert.deepEqual(externas, [], `PRECACHE apunta afuera: ${externas.join(', ')}`);
});

test('el precache entra en lo razonable para una tablet de escuela', () => {
  // No es un límite duro del navegador, es una guarda contra que alguien meta
  // un video de 40 MB en la lista sin darse cuenta.
  let total = 0;
  for (const entrada of leerPrecache()) {
    const limpia = entrada.replace(/^\.?\//, '');
    const ruta = path.join(RAIZ, limpia === '' ? 'index.html' : limpia);
    if (fs.existsSync(ruta)) total += fs.statSync(ruta).size;
  }
  const mb = total / (1024 * 1024);
  assert.ok(mb < 3, `el precache pesa ${mb.toFixed(2)} MB`);
});
