'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameGlobals } = require('./helpers/setup');

const { localStorage: mockLS } = loadGameGlobals();

test('normalizeStats: objeto válido pasa sin cambios', () => {
  const input = { races: 3, correct: 10, total: 12, opMisses: { '+': 2 } };
  assert.deepEqual(normalizeStats(input), input);
});

test('normalizeStats: null/undefined/array corrupto -> valores por defecto', () => {
  assert.deepEqual(normalizeStats(null), { races: 0, correct: 0, total: 0, opMisses: {} });
  assert.deepEqual(normalizeStats(undefined), { races: 0, correct: 0, total: 0, opMisses: {} });
  assert.deepEqual(normalizeStats([1, 2, 3]), { races: 0, correct: 0, total: 0, opMisses: {} });
});

test('normalizeStats: campos faltantes o con tipo incorrecto se completan con default', () => {
  const result = normalizeStats({ races: 'no es un número', opMisses: 'tampoco' });
  assert.equal(result.races, 0);
  assert.equal(result.correct, 0);
  assert.deepEqual(result.opMisses, {});
});

test('readSavedLevel: sin nada guardado -> nivel 1', () => {
  mockLS.clear();
  assert.equal(readSavedLevel(), 1);
});

test('readSavedLevel: valor corrupto (no numérico) -> nivel 1', () => {
  mockLS.clear();
  localStorage.setItem('savedLevel', 'nivel-siete-porfa');
  assert.equal(readSavedLevel(), 1);
});

test('readSavedLevel: valor fuera de rango se acota a [1, 10]', () => {
  mockLS.clear();
  localStorage.setItem('savedLevel', '999');
  assert.equal(readSavedLevel(), 10);
  localStorage.setItem('savedLevel', '-5');
  assert.equal(readSavedLevel(), 1);
});

test('readSavedLevel: valor válido se respeta', () => {
  mockLS.clear();
  localStorage.setItem('savedLevel', '6');
  assert.equal(readSavedLevel(), 6);
});

test('recordRaceStats: acumula carreras, correctas, totales y errores por operación', () => {
  mockLS.clear();
  recordRaceStats({ '+': 2 }, 5, 8);
  recordRaceStats({ '+': 1, '-': 3 }, 4, 6);
  const stats = getStatsHistory();
  assert.equal(stats.races, 2);
  assert.equal(stats.correct, 9);
  assert.equal(stats.total, 14);
  assert.deepEqual(stats.opMisses, { '+': 3, '-': 3 });
});

test('getWeakestOp: null si nunca se erró nada', () => {
  mockLS.clear();
  assert.equal(getWeakestOp(), null);
});

test('getWeakestOp: devuelve la operación con más errores acumulados', () => {
  mockLS.clear();
  recordRaceStats({ '+': 1, '×': 5 }, 3, 5);
  assert.equal(getWeakestOp(), '×');
});

test('getUnlockedStickerIds: sin progreso solo desbloquea los de unlockLevel 0', () => {
  mockLS.clear();
  const unlocked = getUnlockedStickerIds();
  const shouldBeLocked = STICKERS.find(s => s.unlockLevel > 0);
  assert.ok(!unlocked.includes(shouldBeLocked.id));
  STICKERS.filter(s => s.unlockLevel === 0).forEach(s => assert.ok(unlocked.includes(s.id)));
});

test('getUnlockedStickerIds: con maxAILevel alto desbloquea más stickers', () => {
  mockLS.clear();
  localStorage.setItem('maxAILevel', '9');
  const unlocked = getUnlockedStickerIds();
  STICKERS.filter(s => s.unlockLevel <= 9).forEach(s => assert.ok(unlocked.includes(s.id)));
});

test('getStickerById: id desconocido devuelve el primer sticker como fallback', () => {
  assert.equal(getStickerById('no-existe'), STICKERS[0]);
});

test('getWeeklyStats: 7 días, hoy incluido, sin datos -> accuracy null', () => {
  mockLS.clear();
  const days = getWeeklyStats();
  assert.equal(days.length, 7);
  assert.equal(days[6].key, todayKey()); // el último es siempre hoy
  days.forEach(d => assert.equal(d.accuracy, null));
});

test('recordDailyStatsLog: acumula por día y aparece en getWeeklyStats de hoy', () => {
  mockLS.clear();
  recordDailyStatsLog(4, 5);
  recordDailyStatsLog(3, 5);
  const days = getWeeklyStats();
  const today = days[6];
  assert.equal(today.accuracy, 70); // (4+3)/(5+5) = 70%
});

test('recordDailyStatsLog: total 0 no rompe ni ensucia el log', () => {
  mockLS.clear();
  recordDailyStatsLog(0, 0);
  const days = getWeeklyStats();
  assert.equal(days[6].accuracy, null);
});

test('recordRaceStats: además de las stats generales, alimenta el historial semanal', () => {
  mockLS.clear();
  recordRaceStats({}, 8, 10);
  const days = getWeeklyStats();
  assert.equal(days[6].accuracy, 80);
});

test('normalizeStatsLog: datos corruptos (array/string/null) -> objeto vacío', () => {
  assert.deepEqual(normalizeStatsLog(null), {});
  assert.deepEqual(normalizeStatsLog([1, 2]), {});
  assert.deepEqual(normalizeStatsLog('rompido'), {});
});
