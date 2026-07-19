'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameGlobals } = require('./helpers/setup');

loadGameGlobals();

test('rand: siempre devuelve un entero dentro de [min, max]', () => {
  for (let i = 0; i < 200; i++) {
    const n = rand(3, 9);
    assert.ok(Number.isInteger(n));
    assert.ok(n >= 3 && n <= 9);
  }
});

test('rand: min === max devuelve siempre ese valor', () => {
  for (let i = 0; i < 20; i++) assert.equal(rand(5, 5), 5);
});

test('pick: siempre devuelve un elemento del array', () => {
  const arr = ['a', 'b', 'c'];
  for (let i = 0; i < 50; i++) assert.ok(arr.includes(pick(arr)));
});

test('shuffle: conserva todos los elementos, solo cambia el orden', () => {
  const arr = [1, 2, 3, 4, 5];
  const shuffled = shuffle(arr);
  assert.deepEqual([...shuffled].sort(), [...arr].sort());
  assert.notEqual(shuffled, arr); // no debe mutar el original (nueva referencia)
});

test('clamp: acota correctamente por abajo, por arriba y en rango', () => {
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(50, 0, 10), 10);
  assert.equal(clamp(5, 0, 10), 5);
});

test('escapeHtml: escapa las 5 entidades peligrosas', () => {
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(escapeHtml(`& " '`), '&amp; &quot; &#39;');
});

test('escapeHtml: texto normal no se modifica', () => {
  assert.equal(escapeHtml('Ana María'), 'Ana María');
});

test('mulberry32: misma semilla -> misma secuencia (determinismo)', () => {
  const rngA = mulberry32(12345);
  const rngB = mulberry32(12345);
  const seqA = Array.from({ length: 10 }, () => rngA());
  const seqB = Array.from({ length: 10 }, () => rngB());
  assert.deepEqual(seqA, seqB);
});

test('mulberry32: semillas distintas -> secuencias distintas', () => {
  const rngA = mulberry32(1);
  const rngB = mulberry32(2);
  assert.notEqual(rngA(), rngB());
});

test('srand/spick/sshuffle: respetan límites usando una RNG seedeada', () => {
  const rnd = mulberry32(42);
  for (let i = 0; i < 50; i++) {
    const n = srand(rnd, 1, 6);
    assert.ok(n >= 1 && n <= 6);
  }
  const arr = ['a', 'b', 'c', 'd'];
  assert.ok(arr.includes(spick(rnd, arr)));
  assert.deepEqual([...sshuffle(rnd, arr)].sort(), [...arr].sort());
});

test('todayKey/todaySeed: formato estable y numérico', () => {
  assert.match(todayKey(), /^\d{4}-\d{1,2}-\d{1,2}$/);
  assert.ok(Number.isInteger(todaySeed()));
});

test('safeGetJSON: devuelve fallback si el JSON está corrupto', () => {
  localStorage.setItem('_test_corrupt', '{esto no es json');
  assert.deepEqual(safeGetJSON('_test_corrupt', { ok: true }), { ok: true });
});

test('safeGetJSON: devuelve fallback si la clave no existe', () => {
  assert.deepEqual(safeGetJSON('_test_missing_key', { def: 1 }), { def: 1 });
});

test('safeGetJSON: parsea JSON válido correctamente', () => {
  localStorage.setItem('_test_valid', JSON.stringify({ a: 1 }));
  assert.deepEqual(safeGetJSON('_test_valid', null), { a: 1 });
});

test('safeSetItem: no revienta si localStorage.setItem tira excepción', () => {
  const original = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(safeSetItem('x', 'y'), false);
  localStorage.setItem = original;
});

test('dateKeyOffset: mismo formato que todayKey, offset 0 == hoy', () => {
  assert.equal(dateKeyOffset(0), todayKey());
  assert.match(dateKeyOffset(3), /^\d{4}-\d{1,2}-\d{1,2}$/);
});

test('pKey: sin perfil activo devuelve la clave pelada (modo invitado)', () => {
  setCurrentProfileId(null);
  assert.equal(pKey('savedLevel'), 'savedLevel');
});

test('pKey: con perfil activo, namespacea la clave', () => {
  setCurrentProfileId('abc123');
  assert.equal(pKey('savedLevel'), 'p_abc123_savedLevel');
  setCurrentProfileId(null); // no contaminar otros tests
});

test('getMusicVolumePct/getSfxVolumePct: default 80% sin nada guardado', () => {
  localStorage.clear();
  assert.equal(getMusicVolumePct(), 80);
  assert.equal(getSfxVolumePct(), 80);
});

test('getMusicVolumePct: valor corrupto cae al default, valor válido se acota', () => {
  localStorage.setItem('musicVolume', 'no-es-numero');
  assert.equal(getMusicVolumePct(), 80);
  localStorage.setItem('musicVolume', '150');
  assert.equal(getMusicVolumePct(), 100);
  localStorage.clear();
});

test('musicVolumeOffsetDb: 100% es 0dB, 0% es el mínimo (silencio)', () => {
  localStorage.setItem('musicVolume', '100');
  assert.equal(musicVolumeOffsetDb(), 0);
  localStorage.setItem('musicVolume', '0');
  assert.equal(musicVolumeOffsetDb(), -40);
  localStorage.clear();
});

test('sfxVolumeMult: 100% es 1 (sin cambios), 0% es 0 (silencio)', () => {
  localStorage.setItem('sfxVolume', '100');
  assert.equal(sfxVolumeMult(), 1);
  localStorage.setItem('sfxVolume', '0');
  assert.equal(sfxVolumeMult(), 0);
  localStorage.clear();
});
