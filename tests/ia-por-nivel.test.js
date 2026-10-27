'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameGlobals, freshRequire } = require('./helpers/setup');

loadGameGlobals();
const { aiAdvanceAmount } = freshRequire('actions.js');

// La IA corría igual en el nivel 1 y en el 10.
//
// Simulando carreras (el jugador acierta cada intento con probabilidad p),
// con 50 % de aciertos se ganaba el 60 % de las carreras en CUALQUIER nivel:
// los diez niveles cambiaban los números, pero ganar costaba lo mismo. Ahora
// la IA suma un poco de ritmo por nivel. Lo que se mide es la curva entera:
// - en el nivel 1, un chico que acierta la mitad todavía gana seguido;
// - en el 10 hace falta acertar bastante más;
// - el que acierta todo gana siempre, en todos los niveles;
// - el que adivina (≈25 %) no gana en ninguno.

function carrera(p, nivel) {
  state.mode = 'ai';
  state.level = nivel;
  state.positions = [0, 0, 0, 0];
  for (let t = 0; t < 200; t++) {
    let errores = 0;
    while (errores < 3 && Math.random() > p) errores++;
    state.positions[0] += [20, 10, 5, 0][errores];
    for (let i = 1; i < 4; i++) state.positions[i] += aiAdvanceAmount();
    for (let i = 0; i < 4; i++) if (state.positions[i] >= 100) return i === 0;
  }
  return false;
}
function tasa(p, nivel, n = 2000) {
  let g = 0;
  for (let i = 0; i < n; i++) if (carrera(p, nivel)) g++;
  return g / n;
}

test('nivel 1: acertar la mitad alcanza para ganar seguido', () => {
  assert.ok(tasa(0.5, 1) > 0.5);
});

test('nivel 10: acertar la mitad ya no alcanza', () => {
  const t = tasa(0.5, 10);
  assert.ok(t < 0.4, `con 50 % de aciertos gana el ${(t * 100).toFixed(0)} % en el nivel 10`);
});

test('ganar cuesta más a medida que sube el nivel', () => {
  assert.ok(tasa(0.7, 10) < tasa(0.7, 1) - 0.15);
});

test('el que acierta todo gana en todos los niveles', () => {
  for (const nivel of [1, 5, 10]) assert.ok(tasa(1, nivel, 800) > 0.95, `nivel ${nivel}`);
});

test('adivinar no gana en ningún nivel', () => {
  for (const nivel of [1, 5, 10]) assert.ok(tasa(0.25, nivel, 800) < 0.15, `nivel ${nivel}`);
});
