'use strict';
// Regresión: startVsAI() leía savedLevel con parseInt crudo en vez de usar
// readSavedLevel() (state.js) -> un valor corrupto en localStorage daba NaN
// y rompía toda la carrera (LEVELS[NaN] es undefined). Este test evita que
// se vuelva a duplicar esa lectura fuera de donde está permitido.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const JS_DIR = path.join(__dirname, '..', 'js');
const PATTERN = /localStorage\.getItem\(\s*['"]savedLevel['"]\s*\)/g;

test('ningún archivo (salvo state.js, dueño de readSavedLevel) lee savedLevel directamente', () => {
  const offenders = [];
  fs.readdirSync(JS_DIR).forEach(file => {
    if (file === 'state.js') return; // acá vive la única lectura permitida
    const content = fs.readFileSync(path.join(JS_DIR, file), 'utf8');
    if (PATTERN.test(content)) offenders.push(file);
  });
  assert.deepEqual(offenders, [], `estos archivos deberían usar readSavedLevel() en vez de leer savedLevel a mano: ${offenders.join(', ')}`);
});
