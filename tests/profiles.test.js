'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameGlobals } = require('./helpers/setup');

const { localStorage: mockLS } = loadGameGlobals();

test('getProfiles: vacío si nunca se creó ninguno', () => {
  mockLS.clear();
  assert.deepEqual(getProfiles(), []);
});

test('createProfile: crea con nombre recortado a 16 caracteres y lo persiste', () => {
  mockLS.clear();
  const p = createProfile('Un Nombre Muy Pero Muy Largo De Verdad');
  assert.ok(p);
  assert.equal(p.name.length, 16);
  assert.equal(getProfiles().length, 1);
  assert.equal(getProfiles()[0].id, p.id);
});

test('createProfile: nombre vacío o solo espacios no crea nada', () => {
  mockLS.clear();
  assert.equal(createProfile(''), null);
  assert.equal(createProfile('   '), null);
  assert.equal(getProfiles().length, 0);
});

test('createProfile: recorta espacios de los extremos', () => {
  mockLS.clear();
  const p = createProfile('  Ana  ');
  assert.equal(p.name, 'Ana');
});

test('createProfile: respeta el máximo de perfiles', () => {
  mockLS.clear();
  for (let i = 0; i < MAX_PROFILES; i++) createProfile(`Jugador${i}`);
  assert.equal(getProfiles().length, MAX_PROFILES);
  assert.equal(createProfile('Uno de más'), null);
  assert.equal(getProfiles().length, MAX_PROFILES);
});

test('createProfile: ids únicos aunque se cree muy rápido', () => {
  mockLS.clear();
  const p1 = createProfile('A');
  const p2 = createProfile('B');
  assert.notEqual(p1.id, p2.id);
});

test('deleteProfile: lo saca de la lista y borra sus claves p_<id>_*', () => {
  mockLS.clear();
  const p = createProfile('Borrame');
  localStorage.setItem(`p_${p.id}_savedLevel`, '7');
  localStorage.setItem(`p_${p.id}_achievements`, '{"firstWin":true}');
  deleteProfile(p.id);
  assert.equal(getProfiles().length, 0);
  assert.equal(localStorage.getItem(`p_${p.id}_savedLevel`), null);
  assert.equal(localStorage.getItem(`p_${p.id}_achievements`), null);
});

test('deleteProfile: si era el perfil activo, desactiva (vuelve a modo invitado)', () => {
  mockLS.clear();
  const p = createProfile('Activo');
  setActiveProfile(p.id);
  assert.equal(pKey('x'), `p_${p.id}_x`);
  deleteProfile(p.id);
  assert.equal(pKey('x'), 'x'); // volvió a modo invitado
});

test('setActiveProfile: recarga state.level/achievements/selectedStickerId del perfil', () => {
  mockLS.clear();
  const p1 = createProfile('Uno');
  const p2 = createProfile('Dos');
  localStorage.setItem(`p_${p1.id}_savedLevel`, '5');
  localStorage.setItem(`p_${p2.id}_savedLevel`, '2');

  setActiveProfile(p1.id);
  assert.equal(state.level, 5);

  setActiveProfile(p2.id);
  assert.equal(state.level, 2);
});

test('getActiveProfile: null en modo invitado, el perfil correcto si hay uno activo', () => {
  mockLS.clear();
  setActiveProfile(null);
  assert.equal(getActiveProfile(), null);
  const p = createProfile('Vos');
  setActiveProfile(p.id);
  assert.equal(getActiveProfile().id, p.id);
  setActiveProfile(null); // no contaminar otros tests
});
