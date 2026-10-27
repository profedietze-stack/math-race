'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameGlobals, freshRequire } = require('./helpers/setup');

loadGameGlobals();

// Cada pregunta respondida vale UNA jugada.
//
// «Avanzar» y «Bola de fuego» no marcaban la jugada como usada: la pregunta
// siguiente recién se carga 800 ms después, y en ese rato cada toque volvía a
// avanzar. Tres toques seguidos en «Avanzar» daban 60 metros por una sola
// cuenta, y la carrera se ganaba en dos preguntas. No hace falta querer hacer
// trampa: un chico ansioso en una tablet que responde lento toca dos veces.
//
// Y al salir de la carrera los timers seguían vivos: una bola de fuego tirada
// justo antes de «Salir» terminaba la carrera igual, y el cartel de «¡Ganó
// IA-Beta!» aparecía encima del menú (y de paso cortaba la racha de victorias).

const llamadas = { endRace: 0, siguiente: 0 };
function stubsDeCarrera() {
  const elementoMudo = { classList: { add() {}, remove() {} } };
  global.document = { getElementById: () => elementoMudo, querySelectorAll: () => [] };
  global.updatePositions = () => {};
  global.proceedToNextChallenge = () => { llamadas.siguiente++; };
  global.toast = () => {};
  global.setFeedback = () => {};
  global.getHaikuComment = () => {};
  global.triggerExplosion = () => {};
  global.unlockAchievement = () => {};
  global.endRace = () => { llamadas.endRace++; state.gameActive = false; };
  global.endDailyChallenge = () => {};
  global.showScreen = () => {};
}
stubsDeCarrera();
Object.assign(global, freshRequire('actions.js'));
Object.assign(global, freshRequire('results.js'));

function carreraNueva(modo = 'ai') {
  llamadas.endRace = 0;
  llamadas.siguiente = 0;
  state.mode = modo;
  state.dragons = [{ name: 'Vos' }, { name: 'A' }, { name: 'B' }, { name: 'C' }];
  state.positions = [0, 0, 0, 0];
  state.gameActive = true;
  state.carreraId = (state.carreraId || 0) + 1;
  state.wrongStreak = 0;
  state.currentChallenge = { n1: 2, n2: 3, op: '+', correct: 5, answers: [5, 4, 6, 7], answered: true, selectedAnswer: 5 };
}

test('tocar «Avanzar» varias veces avanza una sola vez', () => {
  carreraNueva();
  doMove(); doMove(); doMove();
  assert.equal(state.positions[0], 20);
  assert.equal(llamadas.siguiente, 1, 'cargó más de una pregunta siguiente');
});

test('tocar «Bola de fuego» varias veces ataca una sola vez', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  carreraNueva();
  state.positions = [0, 50, 50, 50];
  doFireball(); doFireball(); doFireball();
  t.mock.timers.tick(1000);
  const golpes = state.positions.slice(1).filter(p => p < 50).length;
  assert.equal(golpes, 1, `la bola de fuego pegó ${golpes} veces`);
});

test('después de una bola de fuego, «Avanzar» ya no suma', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  carreraNueva();
  doFireball();
  doMove();
  t.mock.timers.tick(1000);
  assert.equal(state.positions[0], 0);
});

test('salir de la carrera apaga la bola de fuego que estaba en el aire', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  carreraNueva();
  state.positions = [10, 99, 99, 99]; // la IA cruza la meta con el próximo paso
  doFireball();
  exitConfirm();
  t.mock.timers.tick(2000);
  assert.equal(llamadas.endRace, 0, 'terminó la carrera después de haber salido');
  assert.equal(state.gameActive, false, 'salir no marca la carrera como terminada');
});

test('una bola de fuego vieja no toca la carrera siguiente', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  carreraNueva();
  state.positions = [0, 50, 50, 50];
  doFireball();
  carreraNueva(); // salió y empezó otra antes de que cayera
  t.mock.timers.tick(2000);
  assert.deepEqual(state.positions, [0, 0, 0, 0]);
});
