'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Cada fuente se baja UNA vez.
//
// Las hojas de Google declaran una fuente variable una vez por grosor, con una
// URL distinta cada una pero el mismo archivo. Math Race tenía 14 archivos que
// eran 4 (idénticos byte por byte): el navegador bajaba el mismo Nunito cuatro
// veces, ~117 KB de más en la primera visita, que en el wifi de una escuela es
// lo que más pesa de toda la carga (el código entero son 55 KB).

const RAIZ = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(RAIZ, 'css', 'fuentes.css'), 'utf8');
const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
const dir = path.join(RAIZ, 'fonts');
const archivos = fs.readdirSync(dir).filter(f => f.endsWith('.woff2'));

test('no hay dos archivos de fuente con el mismo contenido', () => {
  const porHuella = {};
  for (const f of archivos) {
    const h = crypto.createHash('md5').update(fs.readFileSync(path.join(dir, f))).digest('hex');
    (porHuella[h] ||= []).push(f);
  }
  const repetidos = Object.values(porHuella).filter(g => g.length > 1);
  assert.deepEqual(repetidos, []);
});

test('cada familia se declara una vez por subconjunto, no una vez por grosor', () => {
  const bloques = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(m => m[1]);
  const familias = {};
  for (const b of bloques) {
    const fam = /font-family:\s*'([^']+)'/.exec(b)[1];
    familias[fam] = (familias[fam] || 0) + 1;
  }
  for (const [fam, n] of Object.entries(familias)) assert.ok(n <= 2, `${fam}: ${n} declaraciones (máximo 2: latin y latin-ext)`);
  for (const b of bloques) assert.match(b, /font-weight:\s*\d+\s+\d+/, 'cada declaración usa un rango de grosores');
});

test('todo archivo declarado existe, y el latino viaja precacheado', () => {
  for (const m of css.matchAll(/url\('\.\.\/(fonts\/[^']+)'\)/g)) {
    assert.ok(fs.existsSync(path.join(RAIZ, m[1])), `${m[1]} no existe`);
    if (!m[1].endsWith('-ext.woff2')) assert.ok(sw.includes(`./${m[1]}`), `${m[1]} falta en PRECACHE`);
  }
});

test('no sobra ningún archivo de fuente sin declarar', () => {
  const declarados = new Set([...css.matchAll(/url\('\.\.\/fonts\/([^']+)'\)/g)].map(m => m[1]));
  assert.deepEqual(archivos.filter(f => !declarados.has(f)), []);
});
