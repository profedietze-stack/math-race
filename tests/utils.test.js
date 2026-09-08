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

test('shuffle: reparte parejo, no deja la respuesta correcta en el mismo lugar', () => {
  // Antes shuffle usaba `sort(() => Math.random() - 0.5)`, un comparador
  // inconsistente que deja los elementos cerca de donde estaban. En un
  // multiple choice de cuatro eso se traduce en que la correcta cae en el
  // primer boton mas seguido de lo que corresponde, y los chicos lo notan.
  //
  // Quedaba ademas la rareza de que el Desafio Diario mezclaba bien (usa
  // sshuffle, que siempre fue Fisher-Yates) y el modo normal no.
  const N = 20000;
  const veces = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) veces[shuffle([0, 1, 2, 3]).indexOf(0)]++;
  for (let pos = 0; pos < 4; pos++) {
    const p = veces[pos] / N;
    assert.ok(
      p > 0.22 && p < 0.28,
      `la primera opcion cae en la posicion ${pos} el ${(p * 100).toFixed(1)}% de las veces`,
    );
  }
});

test('shuffle: no pierde ni duplica elementos, y no toca el original', () => {
  const original = ['a', 'b', 'c', 'd', 'e'];
  for (let i = 0; i < 300; i++) {
    const mezclado = shuffle(original);
    assert.deepEqual([...mezclado].sort(), [...original].sort());
  }
  assert.deepEqual(original, ['a', 'b', 'c', 'd', 'e']);
});

test('shuffle y sshuffle reparten igual de bien', () => {
  // El diario y el modo normal tienen que ofrecer la misma dificultad: si uno
  // reparte mejor que el otro, el puntaje no es comparable.
  const rnd = mulberry32(12345);
  const N = 20000;
  const conSemilla = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) conSemilla[sshuffle(rnd, [0, 1, 2, 3]).indexOf(0)]++;
  for (let pos = 0; pos < 4; pos++) {
    const p = conSemilla[pos] / N;
    assert.ok(p > 0.22 && p < 0.28, `sshuffle: posicion ${pos} al ${(p * 100).toFixed(1)}%`);
  }
});
