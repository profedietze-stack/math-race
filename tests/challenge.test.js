'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameGlobals } = require('./helpers/setup');

loadGameGlobals();

test('buildRemovalDotGrid: cantidad de puntos "quitados" == n2, resto quedan normales', () => {
  const html = buildRemovalDotGrid(8, 3);
  const removed = (html.match(/dot-removed/g) || []).length;
  const kept = (html.match(/dot dot-blue/g) || []).length;
  assert.equal(removed, 3);
  assert.equal(kept, 5);
});

test('buildRemovalDotGrid: nunca muestra más de 20 puntos totales (n1 grande)', () => {
  const html = buildRemovalDotGrid(50, 10);
  const removed = (html.match(/dot-removed/g) || []).length;
  const kept = (html.match(/dot dot-blue/g) || []).length;
  assert.equal(removed + kept, 20);
  assert.ok(html.includes('+30')); // 50 - 20 mostrados = 30 de más
});

test('buildRemovalDotGrid: n2 mayor que n1 no rompe (caso raro, no debería pasar en el juego)', () => {
  const html = buildRemovalDotGrid(3, 5);
  const removed = (html.match(/dot-removed/g) || []).length;
  assert.equal(removed, 3); // se acota a los puntos disponibles
});

test('generateChallenge: la respuesta correcta está entre las 4 opciones', () => {
  const lv = { min: 1, max: 10, ops: ['+', '-'] };
  for (let i = 0; i < 100; i++) {
    const ch = generateChallenge(lv, 0, rand, pick, shuffle);
    assert.ok(ch.answers.includes(ch.correct));
  }
});

test('generateChallenge: siempre 4 respuestas distintas', () => {
  const lv = { min: 1, max: 10, ops: ['+', '-'] };
  for (let i = 0; i < 100; i++) {
    const ch = generateChallenge(lv, 0, rand, pick, shuffle);
    assert.equal(new Set(ch.answers).size, 4);
    ch.answers.forEach(a => assert.ok(a >= 0, 'no debe haber respuestas negativas'));
  }
});

test('generateChallenge: resta nunca da resultado negativo', () => {
  const lv = { min: 1, max: 10, ops: ['-'] };
  for (let i = 0; i < 100; i++) {
    const ch = generateChallenge(lv, 0, rand, pick, shuffle);
    assert.ok(ch.correct >= 0);
    assert.equal(ch.n1 - ch.n2, ch.correct);
  }
});

test('generateChallenge: suma es consistente (n1 + n2 === correct)', () => {
  const lv = { min: 1, max: 20, ops: ['+'] };
  for (let i = 0; i < 100; i++) {
    const ch = generateChallenge(lv, 0, rand, pick, shuffle);
    assert.equal(ch.n1 + ch.n2, ch.correct);
  }
});

test('generateChallenge: multiplicación es consistente y factores entre 2 y 10', () => {
  const lv = { min: 1, max: 30, ops: ['×'] };
  for (let i = 0; i < 100; i++) {
    const ch = generateChallenge(lv, 0, rand, pick, shuffle);
    assert.equal(ch.n1 * ch.n2, ch.correct);
    assert.ok(ch.n1 >= 2 && ch.n1 <= 10);
    assert.ok(ch.n2 >= 2 && ch.n2 <= 10);
  }
});

test('generateChallenge: división siempre exacta (nunca con resto)', () => {
  const lv = { min: 1, max: 50, ops: ['÷'] };
  for (let i = 0; i < 100; i++) {
    const ch = generateChallenge(lv, 0, rand, pick, shuffle);
    assert.equal(ch.n1 % ch.n2, 0, `${ch.n1} / ${ch.n2} debería ser exacta`);
    assert.equal(ch.n1 / ch.n2, ch.correct);
  }
});

test('generateChallenge: con RNG seedeada, misma semilla -> misma pregunta', () => {
  const lv = { min: 1, max: 20, ops: ['+', '-', '×'] };
  const rngA = mulberry32(777);
  const rngB = mulberry32(777);
  const chA = generateChallenge(lv, 0, (a, b) => srand(rngA, a, b), (arr) => spick(rngA, arr), (arr) => sshuffle(rngA, arr));
  const chB = generateChallenge(lv, 0, (a, b) => srand(rngB, a, b), (arr) => spick(rngB, arr), (arr) => sshuffle(rngB, arr));
  assert.deepEqual(chA, chB);
});

test('generateChallenge: el boost de dificultad amplía el rango posible', () => {
  const lv = { min: 1, max: 10, ops: ['+'] };
  let sawAbove10WithBoost = false;
  for (let i = 0; i < 300; i++) {
    const ch = generateChallenge(lv, 3, rand, pick, shuffle);
    if (ch.n1 > 10 || ch.n2 > 10) sawAbove10WithBoost = true;
  }
  assert.ok(sawAbove10WithBoost, 'con boost=3 debería aparecer algún número fuera del rango base');
});

test('generateChallenge: no cuelga con un rango de nivel muy angosto (red de seguridad)', () => {
  const lv = { min: 1, max: 1, ops: ['+'] }; // n1=n2=1, correct=2 siempre
  const ch = generateChallenge(lv, 0, rand, pick, shuffle);
  assert.equal(ch.answers.length, 4);
  assert.equal(new Set(ch.answers).size, 4);
});

test('generateChallenge: el boost también amplía la tabla de multiplicar (hasta 12)', () => {
  const lv = { min: 1, max: 30, ops: ['×'] };
  let sawAbove10 = false;
  for (let i = 0; i < 300; i++) {
    const ch = generateChallenge(lv, 3, rand, pick, shuffle);
    assert.ok(ch.n1 <= 12 && ch.n2 <= 12, 'nunca debería pasar de 12 aunque haya boost');
    if (ch.n1 > 10 || ch.n2 > 10) sawAbove10 = true;
  }
  assert.ok(sawAbove10, 'con boost=3 debería aparecer algún factor entre 11 y 12');
});

test('generateChallenge: el boost también amplía la división (divisor/cociente hasta 12)', () => {
  const lv = { min: 1, max: 50, ops: ['÷'] };
  for (let i = 0; i < 100; i++) {
    const ch = generateChallenge(lv, 3, rand, pick, shuffle);
    assert.equal(ch.n1 % ch.n2, 0);
    assert.ok(ch.n2 <= 12 && ch.correct <= 12);
  }
});

test('buildGroupsDotGrid: n1 filas de hasta n2 puntos (modelo de multiplicación)', () => {
  const html = buildGroupsDotGrid(3, 4);
  const dots = (html.match(/dot dot-blue/g) || []).length;
  assert.equal(dots, 12); // 3 filas x 4 puntos
});

test('buildGroupsDotGrid: acota filas a 6 y columnas a 10, con indicadores de "+"', () => {
  const html = buildGroupsDotGrid(8, 15);
  assert.ok(html.includes('filas más'));
  assert.ok(html.includes('+5')); // 15 - 10 columnas mostradas
});
