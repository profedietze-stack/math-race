'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameGlobals } = require('./helpers/setup');

loadGameGlobals();

test('LEVELS: tiene exactamente 10 niveles', () => {
  assert.equal(LEVELS.length, 10);
});

test('LEVELS: min <= max y ops no vacío en todos los niveles', () => {
  LEVELS.forEach((lv, i) => {
    assert.ok(lv.min <= lv.max, `nivel ${i + 1}: min debe ser <= max`);
    assert.ok(Array.isArray(lv.ops) && lv.ops.length > 0, `nivel ${i + 1}: ops no puede estar vacío`);
  });
});

test('LEVELS: la multiplicación aparece desde nivel 7, la división desde nivel 9', () => {
  for (let i = 0; i < 6; i++) assert.ok(!LEVELS[i].ops.includes('×'), `nivel ${i + 1} no debería tener ×`);
  for (let i = 6; i < 10; i++) assert.ok(LEVELS[i].ops.includes('×'), `nivel ${i + 1} debería tener ×`);
  for (let i = 0; i < 8; i++) assert.ok(!LEVELS[i].ops.includes('÷'), `nivel ${i + 1} no debería tener ÷`);
  for (let i = 8; i < 10; i++) assert.ok(LEVELS[i].ops.includes('÷'), `nivel ${i + 1} debería tener ÷`);
});

test('DAILY_LEVEL_INDEX apunta a un nivel válido de LEVELS', () => {
  assert.ok(DAILY_LEVEL_INDEX >= 0 && DAILY_LEVEL_INDEX < LEVELS.length);
});

test('DAILY_QUESTIONS es un entero positivo', () => {
  assert.ok(Number.isInteger(DAILY_QUESTIONS) && DAILY_QUESTIONS > 0);
});

test('STICKERS: ids únicos y unlockLevel no negativo', () => {
  const ids = STICKERS.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length, 'no debe haber ids duplicados');
  STICKERS.forEach(s => assert.ok(s.unlockLevel >= 0));
});

test('STICKERS: al menos uno libre desde el inicio (unlockLevel 0)', () => {
  assert.ok(STICKERS.some(s => s.unlockLevel === 0));
});

test('ACHIEVS: ids únicos', () => {
  const ids = ACHIEVS.map(a => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('COMMENTS: todos los bancos usados tienen al menos una frase', () => {
  ['correct', 'streak', 'incorrect', 'blocked', 'fireball', 'end_win', 'end_lose'].forEach(bank => {
    assert.ok(Array.isArray(COMMENTS[bank]) && COMMENTS[bank].length > 0, `banco "${bank}" vacío`);
  });
});
