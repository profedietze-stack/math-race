'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Lo que se toca tiene que ser un botón, y un botón tiene que tener nombre.
//
// El selector de jugador del menú y el emoji para cambiar de corredor en vs
// Amigos eran <div>/<span> con onclick: con teclado o con lector de pantalla
// no existen. Y los botones que son sólo un emoji (🎵, ⚙️, 🗑) los lee el
// lector como «nota musical», «engranaje»: hace falta un aria-label.
//
// Se recorren todos los .js y el HTML, para que un archivo nuevo entre solo.

const RAIZ = path.join(__dirname, '..');
const fuentes = ['index.html', ...fs.readdirSync(path.join(RAIZ, 'js')).filter(f => f.endsWith('.js')).map(f => `js/${f}`)]
  .map(f => ({ f, src: fs.readFileSync(path.join(RAIZ, f), 'utf8') }));

test('nada clickeable que no sea un botón', () => {
  const malos = [];
  for (const { f, src } of fuentes) {
    for (const m of src.matchAll(/<(div|span|li|p|img)\b[^>]*\sonclick=/g)) {
      malos.push(`${f}: <${m[1]} onclick>`);
    }
  }
  assert.deepEqual(malos, []);
});

test('los botones que son sólo un emoji tienen aria-label', () => {
  const malos = [];
  for (const { f, src } of fuentes) {
    for (const m of src.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)) {
      const texto = m[2].replace(/\$\{[^}]*\}/g, '').trim();
      const tieneLetras = /\p{L}{2,}/u.test(texto);
      if (!tieneLetras && !/aria-label=/.test(m[1])) malos.push(`${f}: <button${m[1]}>${m[2]}</button>`);
    }
  }
  assert.deepEqual(malos, []);
});
