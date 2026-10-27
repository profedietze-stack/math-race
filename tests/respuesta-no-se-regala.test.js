'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameGlobals } = require('./helpers/setup');

loadGameGlobals();

// Al primer error, el juego iluminaba la respuesta correcta.
//
// El botón correcto se ponía verde durante 900 ms después de cada error, y la
// pregunta seguía abierta: «avanzarás la mitad si aciertas ahora». O sea que
// el segundo intento no pedía pensar, pedía mirar. Tocar cualquier cosa y
// después tocar la verde daba 10 metros por pregunta sin hacer ninguna cuenta,
// contra 11 de promedio de la IA: adivinar rendía casi lo mismo que calcular.
//
// La correcta se muestra recién cuando se acaban los intentos (ahí ya no se
// puede elegir). Y la opción equivocada queda descartada: tocarla otra vez no
// cuenta como un segundo error.

function domFalso(n) {
  const botones = Array.from({ length: n }, () => ({
    disabled: false,
    clases: new Set(),
    get classList() {
      const c = this.clases;
      return { add: (x) => c.add(x), remove: (x) => c.delete(x), contains: (x) => c.has(x) };
    },
  }));
  global.document = {
    getElementById: (id) => {
      const m = /^abtn-(\d+)$/.exec(id);
      return m ? botones[Number(m[1])] : null;
    },
    querySelectorAll: (sel) => (sel === '.answer-btn' ? botones : []),
  };
  return botones;
}

global.getHaikuComment = () => {};
global.unlockAchievement = () => {};

function preguntaNueva() {
  state.mode = 'ai';
  state.wrongStreak = 0;
  state.streak = 0;
  state.totalCount = 0;
  state.correctCount = 0;
  state.opMisses = {};
  state.currentChallenge = { n1: 2, n2: 3, op: '+', correct: 5, answers: [4, 5, 6, 7], answered: false, selectedAnswer: null };
  return domFalso(4);
}

test('el primer error no muestra cuál era la correcta', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const b = preguntaNueva();
  selectAnswer(4, 0);
  assert.equal(b[1].classList.contains('correct'), false, 'la correcta se iluminó tras el primer error');
  t.mock.timers.tick(2000);
  assert.equal(b[1].classList.contains('correct'), false);
});

test('el segundo error tampoco', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const b = preguntaNueva();
  selectAnswer(4, 0);
  t.mock.timers.tick(1500);
  selectAnswer(6, 2);
  assert.equal(b[1].classList.contains('correct'), false);
});

test('al tercer error sí se muestra, y ya no se puede elegir', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const b = preguntaNueva();
  selectAnswer(4, 0); t.mock.timers.tick(1500);
  selectAnswer(6, 2); t.mock.timers.tick(1500);
  selectAnswer(7, 3);
  assert.equal(b[1].classList.contains('correct'), true);
  assert.ok(b.every(x => x.disabled), 'quedó algún botón habilitado');
});

test('la opción equivocada queda descartada', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const b = preguntaNueva();
  selectAnswer(4, 0);
  t.mock.timers.tick(1500);
  assert.equal(b[0].disabled, true, 'se puede volver a tocar la opción ya descartada');
  assert.equal(b[1].disabled, false, 'se deshabilitó una opción que no se tocó');
});

test('tocar dos veces la misma opción equivocada cuenta un solo error', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  preguntaNueva();
  selectAnswer(4, 0);
  selectAnswer(4, 0);
  assert.equal(state.wrongStreak, 1);
  assert.equal(state.totalCount, 1);
});
