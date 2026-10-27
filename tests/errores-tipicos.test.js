'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameGlobals } = require('./helpers/setup');

loadGameGlobals();

// Distractores que enseñan, y una pista que dice qué se hizo mal.
//
// Las opciones incorrectas eran números al azar cerca de la correcta: se
// descartaban «a ojo» sin pensar en la cuenta. Las que sirven son las que
// salen de los errores que de verdad cometen los chicos: sumar en vez de
// restar, contar uno de más, equivocarse en las decenas, una fila de más en
// la multiplicación. Elegir una de esas dice algo sobre cómo se pensó.
//
// Y al equivocarse, el juego decía «¡Casi!» siempre. Ahora, si la opción
// elegida corresponde a un error conocido, lo nombra.

test('restar: sumar en vez de restar es un error típico', () => {
  const e = erroresTipicos('-', 7, 3, 4);
  const sumo = e.find(x => x.valor === 10);
  assert.ok(sumo, JSON.stringify(e));
  assert.match(sumo.motivo, /sumaste/i);
});

test('sumar: restar en vez de sumar, uno de más y uno de menos', () => {
  const vals = erroresTipicos('+', 8, 5, 13).map(x => x.valor);
  for (const v of [3, 12, 14]) assert.ok(vals.includes(v), `falta ${v}: ${vals}`);
});

test('multiplicar: una fila de más o de menos, y sumar en vez de multiplicar', () => {
  const vals = erroresTipicos('×', 4, 6, 24).map(x => x.valor);
  for (const v of [18, 30, 10]) assert.ok(vals.includes(v), `falta ${v}: ${vals}`);
});

test('dividir: restar en vez de dividir', () => {
  const vals = erroresTipicos('÷', 12, 3, 4).map(x => x.valor);
  assert.ok(vals.includes(9), `${vals}`);
});

test('ningún error típico vale lo mismo que la correcta ni es negativo', () => {
  for (let i = 0; i < 3000; i++) {
    const ch = generateChallenge(LEVELS[i % 10], i % 4, rand, pick, shuffle);
    for (const e of erroresTipicos(ch.op, ch.n1, ch.n2, ch.correct)) {
      assert.notEqual(e.valor, ch.correct, `${ch.n1}${ch.op}${ch.n2}`);
      assert.ok(e.valor >= 0 && Number.isInteger(e.valor));
    }
  }
});

test('la mayoría de las preguntas trae un error típico entre las opciones', () => {
  let con = 0;
  const N = 5000;
  for (let i = 0; i < N; i++) {
    const ch = generateChallenge(LEVELS[i % 10], 0, rand, pick, shuffle);
    const tipicos = erroresTipicos(ch.op, ch.n1, ch.n2, ch.correct).map(e => e.valor);
    if (ch.answers.some(a => a !== ch.correct && tipicos.includes(a))) con++;
  }
  assert.ok(con / N > 0.6, `sólo ${(100 * con / N).toFixed(0)} %`);
});

test('cada distractor es un error típico o está a 8 o menos de la correcta', () => {
  for (let i = 0; i < 4000; i++) {
    const ch = generateChallenge(LEVELS[i % 10], i % 4, rand, pick, shuffle);
    const tipicos = erroresTipicos(ch.op, ch.n1, ch.n2, ch.correct).map(e => e.valor);
    for (const a of ch.answers) {
      assert.ok(Math.abs(a - ch.correct) <= 8 || tipicos.includes(a), `${a} en ${ch.n1}${ch.op}${ch.n2}=${ch.correct}`);
    }
  }
});

test('la pista nombra el error cuando se lo reconoce', () => {
  const ch = { op: '-', n1: 7, n2: 3, correct: 4 };
  assert.match(pistaDelError(ch, 10), /sumaste/i);
});

test('si no es un error conocido, la pista dice para dónde corregir', () => {
  const ch = { op: '+', n1: 20, n2: 30, correct: 50 };
  assert.match(pistaDelError(ch, 44), /más grande/i);
  assert.match(pistaDelError(ch, 57), /más chic/i);
});

test('la pista nunca dice la respuesta', () => {
  for (let i = 0; i < 2000; i++) {
    const ch = generateChallenge(LEVELS[i % 10], 0, rand, pick, shuffle);
    for (const a of ch.answers.filter(x => x !== ch.correct)) {
      const pista = pistaDelError(ch, a);
      assert.doesNotMatch(pista, new RegExp(`(^|\\D)${ch.correct}(\\D|$)`), `${pista} (correcta ${ch.correct})`);
    }
  }
});
