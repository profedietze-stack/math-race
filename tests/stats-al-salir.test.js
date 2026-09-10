'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadGameGlobals } = require('./helpers/setup');

const { localStorage: mockLS } = loadGameGlobals();

const RESULTS_JS = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'results.js'), 'utf8',
);

// Salir de una carrida a mitad de camino borraba lo que el alumno respondió.
//
// Las estadísticas —precisión acumulada, qué operación falla más, el gráfico de
// los últimos siete días— son lo único que el docente mira para saber cómo va
// cada chico. Se guardaban en tres lugares: al terminar una carrera, al
// terminar el Desafío Diario, y al salir **sólo en modo práctica**.
//
// O sea: el alumno que juega veinte preguntas contra la IA y cierra el juego
// antes de llegar a los 100 metros no deja rastro. Y en un aula esa es la
// situación normal, no la rara: suena el timbre y treinta tablets se cierran a
// mitad de carrera. El gráfico semanal se quedaba sistemáticamente sin esos
// días.

function prepararCarrera(modo, correctas, total, opMisses) {
  mockLS.clear();
  state.mode = modo;
  state.correctCount = correctas;
  state.totalCount = total;
  state.opMisses = opMisses || {};
  state._statsGuardadas = false;
}

test('salir de una carrera vs IA guarda lo que se respondió', () => {
  prepararCarrera('ai', 7, 10, { '+': 2, '-': 1 });
  const guardo = guardarEstadisticasDeCarrera();
  assert.equal(guardo, true, 'no guardó nada al salir de una carrera vs IA');

  const stats = getStatsHistory();
  assert.equal(stats.correct, 7);
  assert.equal(stats.total, 10);
  assert.equal(stats.opMisses['+'], 2);
});

test('y salir de una carrera vs Amigos también', () => {
  prepararCarrera('human', 4, 9, { '×': 3 });
  assert.equal(guardarEstadisticasDeCarrera(), true);
  const stats = getStatsHistory();
  assert.equal(stats.total, 9);
});

test('modo práctica sigue guardando, como antes', () => {
  prepararCarrera('practice', 12, 15, {});
  assert.equal(guardarEstadisticasDeCarrera(), true);
  assert.equal(getStatsHistory().total, 15);
});

test('no guarda dos veces la misma carrera', () => {
  // Si la carrera terminó sola y además se toca Salir, los mismos aciertos no
  // pueden contarse dos veces: el gráfico del docente quedaría inflado.
  prepararCarrera('ai', 5, 6, {});
  assert.equal(guardarEstadisticasDeCarrera(), true);
  assert.equal(guardarEstadisticasDeCarrera(), false, 'guardó la carrera dos veces');
  const stats = getStatsHistory();
  assert.equal(stats.total, 6);
  assert.equal(stats.races, 1);
});

test('no guarda una carrera sin ninguna respuesta', () => {
  // Entrar y salir sin contestar nada no es un día jugado: sumaría una carrera
  // con cero de cero y ensuciaría el promedio.
  prepararCarrera('ai', 0, 0, {});
  assert.equal(guardarEstadisticasDeCarrera(), false);
  assert.equal(getStatsHistory().races, 0);
});

test('el historial semanal recoge lo que se guardó al salir', () => {
  prepararCarrera('ai', 8, 10, {});
  guardarEstadisticasDeCarrera();
  const dias = getWeeklyStats();
  const hoy = dias[dias.length - 1];
  assert.equal(hoy.accuracy, 80, 'el día de hoy no quedó en el gráfico semanal');
});

test('los tres finales de carrera pasan por el mismo guardado', () => {
  // Si alguno sigue llamando a recordRaceStats() directo, se saltea la marca de
  // "ya guardada" y vuelve el doble conteo.
  const directas = (RESULTS_JS.match(/recordRaceStats\(/g) || []).length;
  assert.equal(
    directas, 0,
    'results.js todavía llama a recordRaceStats() directo en vez de guardarEstadisticasDeCarrera()',
  );
  assert.ok(
    /function exitConfirm\(\)[\s\S]*?guardarEstadisticasDeCarrera\(\)/.test(RESULTS_JS),
    'exitConfirm no guarda las estadísticas',
  );
  assert.ok(
    !/state\.mode === 'practice' && state\.totalCount > 0/.test(RESULTS_JS),
    'exitConfirm sigue guardando sólo en modo práctica',
  );
});
