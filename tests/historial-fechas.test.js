'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameGlobals } = require('./helpers/setup');

const { localStorage: mockLS } = loadGameGlobals();

// El historial semanal se borraba solo desde el 1 de octubre.
//
// Las claves de día no llevan ceros ("2026-10-27", "2026-8-28") y la poda de
// días viejos las comparaba como texto: "2026-10-27" < "2026-8-28" es
// verdadero, porque el "1" va antes que el "8". Así que cada vez que se
// guardaba una carrera de octubre, la poda borraba justo el día de hoy. El
// gráfico de los últimos 7 días —lo que mira el docente— quedaba vacío de
// octubre a diciembre, y cualquier mes de dos cifras contra uno de una.
//
// Se prueba con la fecha fija, no con la de hoy: el test que ya existía sólo
// fallaba en esos meses, y en septiembre habría pasado igual.

function conFecha(t, fecha) {
  t.mock.timers.enable({ apis: ['Date'], now: fecha });
}

for (const [nombre, fecha] of [
  ['27 de octubre (cutoff en agosto)', new Date(2026, 9, 27, 12)],
  ['5 de noviembre (cutoff en septiembre)', new Date(2026, 10, 5, 12)],
  ['10 de diciembre', new Date(2026, 11, 10, 12)],
  ['15 de marzo', new Date(2027, 2, 15, 12)],
]) {
  test(`el día de hoy queda en el historial: ${nombre}`, (t) => {
    conFecha(t, fecha);
    mockLS.clear();
    recordDailyStatsLog(8, 10);
    const hoy = getWeeklyStats().at(-1);
    assert.equal(hoy.accuracy, 80, `se podó el día ${hoy.key}`);
  });
}

test('la poda sí borra lo de hace más de 60 días, y deja lo reciente', (t) => {
  conFecha(t, new Date(2026, 9, 27, 12));
  mockLS.clear();
  localStorage.setItem('dailyStatsLog', JSON.stringify({
    '2026-7-1': { correct: 1, total: 2 },   // viejo: se va
    '2026-9-30': { correct: 3, total: 4 },  // reciente: queda
    '2026-10-25': { correct: 5, total: 5 }, // reciente: queda
  }));
  recordDailyStatsLog(1, 1);
  const log = JSON.parse(localStorage.getItem('dailyStatsLog'));
  assert.deepEqual(Object.keys(log).sort(), ['2026-10-25', '2026-10-27', '2026-9-30']);
});

test('una clave ilegible en el log no rompe la poda', (t) => {
  conFecha(t, new Date(2026, 9, 27, 12));
  mockLS.clear();
  localStorage.setItem('dailyStatsLog', JSON.stringify({ basura: { correct: 1, total: 1 } }));
  recordDailyStatsLog(1, 2);
  assert.equal(getWeeklyStats().at(-1).accuracy, 50);
});
