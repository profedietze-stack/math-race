'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// La carrera no tiene scroll: pista, cuenta y respuestas entran en la pantalla.
//
// Medido en navegador el 28-oct-2026, en un celular de 320×568 con enunciado y
// comentario largo: la pista tenía 29 px de scroll, la zona de cuenta 118, y el
// último renglón y las respuestas quedaban fuera de la pantalla. Las barras
// estaban en el CSS (overflow-y: auto) como parche de «si no entra, que se
// desplace». El layout real (alto de pistas, tamaños, pasos de compactación) se
// midió con Playwright en 8 tamaños; acá se guardan las dos cosas que se pueden
// romper sin que nadie lo note: que vuelva el scroll al CSS, y que el ajuste de
// alto achique en el orden correcto.

const RAIZ = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(RAIZ, 'css', 'style.css'), 'utf8');

test('la pista y la zona de cuenta no declaran scroll vertical', () => {
  const conScroll = [];
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = m[1].trim().split('\n').pop().trim();
    if (!/race-track-wrapper|challenge-zone|#gameScreen|\.lane\b/.test(sel)) continue;
    if (/overflow(-y)?:\s*(auto|scroll)/.test(m[2])) conScroll.push(sel);
  }
  assert.deepEqual(conScroll, []);
});

test('las pistas no son más altas de 44 px ni se estiran con el contenido', () => {
  const regla = [...css.matchAll(/\.lane\s*\{([^}]*)\}/g)].map(m => m[1]).filter(b => /height:\s*clamp/.test(b)).pop();
  assert.ok(regla, 'falta .lane con alto en clamp()');
  const [, , max] = /height:\s*clamp\(\s*(\d+)px,\s*[\d.]+dvh,\s*(\d+)px\)/.exec(regla) ?? [];
  assert.ok(Number(max) <= 44, `alto máximo de pista ${max}px`);
  assert.match(regla, /flex:\s*0 0 auto/);
});

// ── ajustarAlto: achica por pasos, solo si hace falta ──

function zonaFalsa({ visible = true, alturas, cliente }) {
  const clases = new Set(['compacto', 'minimo']); // arranca con restos del ajuste anterior
  return {
    offsetParent: visible ? {} : null,
    clientHeight: cliente,
    get scrollHeight() { return clases.has('minimo') ? alturas.minimo : clases.has('compacto') ? alturas.compacto : alturas.normal; },
    classList: {
      remove: (...c) => c.forEach(x => clases.delete(x)),
      add: c => clases.add(c),
      contains: c => clases.has(c),
    },
    pasos: () => ['compacto', 'minimo'].filter(c => clases.has(c)),
  };
}

function ajustarCon(zona) {
  global.document = { getElementById: () => zona };
  delete require.cache[require.resolve('../js/race-track.js')];
  const { ajustarAlto } = require('../js/race-track.js');
  ajustarAlto();
  delete global.document;
  return zona.pasos();
}

test('si todo entra, no se achica nada (y se sueltan los pasos viejos)', () => {
  assert.deepEqual(ajustarCon(zonaFalsa({ cliente: 400, alturas: { normal: 380, compacto: 300, minimo: 250 } })), []);
});

test('si falta poco alcanza el primer paso', () => {
  assert.deepEqual(ajustarCon(zonaFalsa({ cliente: 400, alturas: { normal: 440, compacto: 395, minimo: 300 } })), ['compacto']);
});

test('si el primer paso no alcanza, se esconde el dibujo (último recurso)', () => {
  assert.deepEqual(ajustarCon(zonaFalsa({ cliente: 400, alturas: { normal: 500, compacto: 450, minimo: 390 } })), ['compacto', 'minimo']);
});

test('con la pantalla oculta no toca nada', () => {
  assert.deepEqual(ajustarCon(zonaFalsa({ visible: false, cliente: 0, alturas: { normal: 500, compacto: 450, minimo: 390 } })), ['compacto', 'minimo']);
});

test('el nombre del nivel va en un span que el CSS esconde en celulares angostos', () => {
  const js = fs.readFileSync(path.join(RAIZ, 'js', 'race-track.js'), 'utf8');
  assert.match(js, /className = 'nivel-nombre'/);
  assert.match(css, /@media \(max-width: 420px\)\s*\{[^}]*\.level-badge \.nivel-nombre\s*\{\s*display:\s*none/);
});
