'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// El menú de inicio entra en la pantalla del celular.
//
// Medido en navegador el 28-oct-2026: en 320×568 se pasaba 117 px y en 360×640
// 72 px (el título gigante, 64 px de margen para esquivar los botones
// flotantes y cinco botones). El layout se midió con Playwright en 10 tamaños;
// acá se guardan las reglas que lo sostienen y que se pueden romper sin que
// nadie lo note.

const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');

// Todas las reglas `selector { ... }`, incluidas las de dentro de @media: el
// cuerpo no puede tener llaves, así el @media que las envuelve no se las traga.
const reglas = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim().split('\n').pop().trim(), cuerpo: m[2] }));
const decl = (sel, prop) => reglas.filter(r => r.sel === sel).map(r => new RegExp(`(^|[;\\s])${prop}:\\s*([^;]+)`).exec(r.cuerpo)?.[2]).filter(Boolean);

test('el título se achica con el alto de la pantalla, no solo con el ancho', () => {
  for (const sel of ['.home-title-line1', '.home-title-line2']) {
    assert.ok(decl(sel, 'font-size').some(v => /dvh/.test(v)), `${sel} sin dvh`);
  }
});

test('los botones del menú se achican con el alto de la pantalla', () => {
  assert.ok(decl('.menu-btn', 'padding').some(v => /dvh/.test(v)));
  assert.ok(decl('.home-panel', 'gap').some(v => /dvh/.test(v)));
});

test('el título empieza debajo de los botones flotantes de música y accesibilidad', () => {
  const top = Number(/top:\s*(\d+)px/.exec(reglas.find(r => r.sel === '.music-toggle' && /position:\s*fixed/.test(r.cuerpo)).cuerpo)[1]);
  const alto = 44; // «.music-toggle { width: 44px; height: 44px }» en el bloque de accesibilidad
  assert.ok(decl('.music-toggle', 'height').includes('44px'));
  const minimo = Number(/clamp\(\s*(\d+)px/.exec(decl('.home-hero', 'padding-top').pop())[1]);
  assert.ok(minimo >= top + alto, `margen de arriba ${minimo}px < ${top + alto}px`);
});

test('en celular apaisado el menú pasa a dos columnas', () => {
  assert.ok(reglas.some(r => r.sel === '#homeScreen.active' && /grid-template-columns/.test(r.cuerpo)));
  assert.ok(decl('#homeScreen .menu-btn', 'min-height').includes('44px'), 'botón apaisado menor al mínimo táctil');
});
