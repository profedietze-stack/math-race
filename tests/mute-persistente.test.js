'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGameGlobals, freshRequire } = require('./helpers/setup');

const { localStorage: mockLS } = loadGameGlobals();

// Silenciar la música no se recordaba.
//
// `musicMuted` arrancaba siempre en false: el docente silencia el juego en
// treinta tablets, al día siguiente lo abren y la música vuelve a sonar en
// todas al primer toque. El volumen sí se guardaba; el botón de silencio no.

function cargarAudio() {
  global.window = global;
  global.document = { querySelectorAll: () => [], querySelector: () => null, getElementById: () => null };
  for (const f of ['showScreen', 'launchGame', 'returnHome', 'selectAnswer', 'doFireball', 'renderAnswerBtns']) {
    global[f] = () => {};
  }
  return freshRequire('audio.js');
}

test('el silencio guardado se respeta al abrir el juego', () => {
  mockLS.clear();
  localStorage.setItem('musicMuted', '1');
  const audio = cargarAudio();
  assert.equal(audio.isMusicMuted(), true);
});

test('sin nada guardado arranca con música', () => {
  mockLS.clear();
  const audio = cargarAudio();
  assert.equal(audio.isMusicMuted(), false);
});

test('tocar el botón guarda la elección', () => {
  mockLS.clear();
  const audio = cargarAudio();
  audio.toggleMusic();
  assert.equal(localStorage.getItem('musicMuted'), '1');
  audio.toggleMusic();
  assert.equal(localStorage.getItem('musicMuted'), '0');
});
