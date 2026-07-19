'use strict';
// Regresión: utils.js cargó una vez DESPUÉS de state.js en index.html, y
// state.js usa clamp()/safeGetJSON() (de utils.js) al construirse -> rompía
// el juego entero apenas se abría la página. Este test asegura que el orden
// de <script src> en index.html respeta las dependencias entre módulos.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="js\/([^"]+)"[^>]*><\/script>/g)].map(m => m[1]);

function indexOf(file) {
  const i = scripts.indexOf(file);
  assert.ok(i !== -1, `no se encontró <script src="js/${file}"> en index.html`);
  return i;
}

test('index.html: utils.js carga antes que state.js (state.js usa clamp/safeGetJSON)', () => {
  assert.ok(indexOf('utils.js') < indexOf('state.js'));
});

test('index.html: data.js carga antes que state.js (state.js usa STICKERS)', () => {
  assert.ok(indexOf('data.js') < indexOf('state.js'));
});

test('index.html: utils.js y data.js cargan antes que challenge.js', () => {
  assert.ok(indexOf('utils.js') < indexOf('challenge.js'));
  assert.ok(indexOf('data.js') < indexOf('challenge.js'));
});

test('index.html: audio.js es el último módulo de juego (parchea a los anteriores)', () => {
  const gameScripts = scripts.filter(s => s !== 'main.js');
  assert.equal(gameScripts[gameScripts.length - 1], 'audio.js');
});

test('index.html: main.js es el último script cargado', () => {
  assert.equal(scripts[scripts.length - 1], 'main.js');
});
