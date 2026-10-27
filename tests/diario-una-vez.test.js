'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameGlobals, freshRequire } = require('./helpers/setup');

const { localStorage: mockLS } = loadGameGlobals();

// El Desafío Diario es una vez por día, pero la marca recién se ponía al
// terminar las 10 preguntas. Salir a la 9ª, si iba mal, y volver a entrar
// daba las mismas preguntas en el mismo orden (la semilla es la fecha): se
// podía repetir hasta sacar 100 %, y la precisión del diario —lo que se
// compara entre compañeros— dejaba de significar algo.
//
// Ahora se marca al empezar. Si se sale antes de terminar, queda la precisión
// de lo que se respondió.

const toasts = [];
let lanzadas = 0;
global.document = { getElementById: () => ({ classList: { add() {}, remove() {} } }), querySelectorAll: () => [] };
global.toast = (m) => toasts.push(m);
global.launchGame = () => { lanzadas++; state.gameActive = true; };
global.showScreen = () => {};
Object.assign(global, freshRequire('stickers.js'));
Object.assign(global, freshRequire('results.js'));

function limpio() { mockLS.clear(); toasts.length = 0; lanzadas = 0; }

test('salir del diario a mitad no deja volver a jugarlo hoy', () => {
  limpio();
  startDailyChallenge();
  assert.equal(lanzadas, 1);
  state.correctCount = 2; state.totalCount = 5; state.opMisses = {}; state._statsGuardadas = false;
  exitConfirm();
  startDailyChallenge();
  assert.equal(lanzadas, 1, 'se pudo volver a empezar el diario del mismo día');
});

test('lo respondido antes de salir queda como precisión del día', () => {
  limpio();
  startDailyChallenge();
  state.correctCount = 3; state.totalCount = 4; state.opMisses = {}; state._statsGuardadas = false;
  exitConfirm();
  assert.equal(localStorage.getItem(pKey('dailyAccuracy')), '75');
  startDailyChallenge();
  assert.match(toasts.at(-1), /75%/);
});

test('salir sin responder nada no muestra un porcentaje inventado', () => {
  limpio();
  startDailyChallenge();
  state.correctCount = 0; state.totalCount = 0; state.opMisses = {}; state._statsGuardadas = false;
  exitConfirm();
  startDailyChallenge();
  assert.doesNotMatch(toasts.at(-1), /null|NaN|undefined/);
});
