'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// El estilo vive en el CSS, no desparramado en el HTML y en los .js.
//
// Había 50 `style="..."` sueltos. Además de imposibles de mantener parejos
// (cuatro tamaños distintos para el mismo rótulo), escondían textos que el
// chico tiene que leer a 8-9 px —«+3 filas más», «+2 grupos más»— donde
// ninguna regla de accesibilidad del CSS los alcanzaba.
//
// Quedan permitidos los estilos que calcula el JS (llevan `${`), y
// `display:none` en lo que el JS muestra y esconde.

const RAIZ = path.join(__dirname, '..');
const archivos = ['index.html', ...fs.readdirSync(path.join(RAIZ, 'js')).filter(f => f.endsWith('.js')).map(f => `js/${f}`)];

test('no hay estilos fijos escritos a mano en el HTML ni en los .js', () => {
  const sueltos = [];
  for (const f of archivos) {
    const src = fs.readFileSync(path.join(RAIZ, f), 'utf8');
    for (const m of src.matchAll(/style="([^"]*)"/g)) {
      const s = m[1].trim();
      if (s.includes('${') || /^display:\s*none;?$/.test(s)) continue;
      sueltos.push(`${f}: style="${s}"`);
    }
  }
  assert.deepEqual(sueltos, []);
});

test('ningún texto del CSS baja de 0.68rem (≈11 px)', () => {
  // Los decorativos (✦) se marcan con aria-hidden y no cuentan.
  const css = fs.readFileSync(path.join(RAIZ, 'css', 'style.css'), 'utf8');
  const chicos = [];
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = m[1].trim();
    const fsm = /font-size:\s*([\d.]+)rem/.exec(m[2]);
    if (!fsm) continue;
    if (/profe-dot|divider-star|lock|::after|::before|explosion|exp-/.test(sel)) continue;
    if (parseFloat(fsm[1]) < 0.68) chicos.push(`${sel.split('\n').pop()} → ${fsm[1]}rem`);
  }
  assert.deepEqual(chicos, []);
});
