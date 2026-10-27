'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameGlobals } = require('./helpers/setup');

loadGameGlobals();

// La correcta casi nunca era la opción más grande.
//
// Los distractores salían al azar de correcta ± 8. La POSICIÓN en pantalla ya
// se barajaba (25/25/25/25), pero lo que se aprende no es un lugar, es un
// tamaño: con distractores simétricos, la correcta quedaba en el medio de las
// cuatro. Medido sobre 20.000 preguntas por nivel, era la 2ª o 3ª más chica el
// 78 % de las veces y la más grande entre el 6 y el 9 %. «Nunca la mayor,
// elegí una del medio» acertaba bastante más que el azar sin hacer la cuenta.
//
// Se mide el RANGO de la correcta entre las opciones ordenadas, además de su
// índice. Sólo en preguntas donde la correcta vale 8 o más: con un resultado
// de 0, 1 o 2 no hay tres números naturales más chicos, y ahí ser la menor es
// inevitable, no un sesgo.

const N = 6000;

for (let nivel = 1; nivel <= 10; nivel++) {
  test(`nivel ${nivel}: la correcta cae parejo entre la más chica y la más grande`, () => {
    const rango = [0, 0, 0, 0];
    let contadas = 0;
    for (let i = 0; i < N; i++) {
      const ch = generateChallenge(LEVELS[nivel - 1], 0, rand, pick, shuffle);
      if (ch.correct < 8) continue;
      const orden = [...ch.answers].sort((a, b) => a - b);
      rango[orden.indexOf(ch.correct)]++;
      contadas++;
    }
    const pct = rango.map(x => x / contadas);
    for (let r = 0; r < 4; r++) {
      assert.ok(pct[r] > 0.20 && pct[r] < 0.30,
        `rango ${r} (0 = la más chica) sale ${(pct[r] * 100).toFixed(1)} %: ${pct.map(p => (p * 100).toFixed(0)).join('/')}`);
    }
  });
}

// La cercanía de los distractores (a 8 o menos, o un error típico) se prueba
// en errores-tipicos.test.js.
