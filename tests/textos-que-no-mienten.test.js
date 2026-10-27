'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadGameGlobals, freshRequire } = require('./helpers/setup');

loadGameGlobals();
global.document = { getElementById: () => null, querySelectorAll: () => [] };
Object.assign(global, freshRequire('results.js'));

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Cosas que la pantalla decía y no eran así.

test('se puede hacer zoom: la página no lo bloquea', () => {
  // `user-scalable=no` y `maximum-scale=1` impiden agrandar con dos dedos.
  // Para un chico con baja visión es la única lupa que tiene en una tablet
  // (WCAG 1.4.4). El doble toque accidental se evita con touch-action, no
  // prohibiendo el zoom.
  const viewport = /<meta name="viewport" content="([^"]+)"/.exec(HTML)[1];
  assert.doesNotMatch(viewport, /user-scalable\s*=\s*no/);
  assert.doesNotMatch(viewport, /maximum-scale\s*=\s*1(\.0)?\b/);
});

test('«Salir» no promete perder lo que en realidad se guarda', () => {
  // Desde que salir guarda las respuestas (ver stats-al-salir), el cartel que
  // decía «Tu progreso en esta carrera se perderá» asustaba de más: lo que se
  // pierde es la carrera, no lo respondido.
  assert.doesNotMatch(HTML, /Tu progreso en esta carrera se perder/);
});

test('en vs Amigos el cartel final nombra a quien ganó', () => {
  // «¡Ganaste!» le hablaba al dispositivo: si ganaba el jugador 1 decía
  // «¡Ganaste!» a los cuatro que estaban mirando, y si ganaba otro, salía con
  // la cara de derrota 😅.
  const dragones = [{ name: 'Ana' }, { name: 'Beto' }, { name: 'Caro' }];
  assert.equal(tituloDeResultado('human', 0, dragones).titulo, '¡Ganó Ana!');
  assert.equal(tituloDeResultado('human', 2, dragones).titulo, '¡Ganó Caro!');
  assert.equal(tituloDeResultado('human', 2, dragones).emoji, '🏆');
});

test('contra la IA sigue hablándole al jugador', () => {
  const dragones = [{ name: 'Tú' }, { name: 'IA-Alfa' }];
  assert.deepEqual(tituloDeResultado('ai', 0, dragones), { emoji: '🏆', titulo: '¡Ganaste!' });
  assert.deepEqual(tituloDeResultado('ai', 1, dragones), { emoji: '😅', titulo: '¡Ganó IA-Alfa!' });
});

test('sin rivales no se ofrece la bola de fuego', () => {
  // En Práctica y en el Desafío Diario se corre solo. El botón estaba igual, y
  // al tocarlo decía «No hay rivales para atacar»: un botón que no puede hacer
  // nada es ruido en la pantalla más importante del juego.
  assert.equal(hayRivales([{ name: 'Tú' }]), false);
  assert.equal(hayRivales([{ name: 'Tú' }, { name: 'IA' }]), true);
});
