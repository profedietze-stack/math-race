'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { leerPrecache } = require('./helpers/precache-hash');

// El juego se ofrecía como app instalable con íconos que no sirven para eso.
//
// Los dos íconos del manifest eran SVG dentro de un data: URI con un emoji
// adentro: Chrome pide PNG de 192 y 512 para ofrecer «Instalar», y el emoji
// se dibuja con la fuente de cada sistema (o como un cuadradito). Tampoco
// había favicon: cada carga dejaba un 404 en la consola.

const RAIZ = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(RAIZ, 'manifest.json'), 'utf8'));
const HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const precache = leerPrecache().map(e => e.replace(/^\.?\//, ''));

// Ancho y alto de un PNG, leídos de la cabecera IHDR.
function tamañoPng(archivo) {
  const b = fs.readFileSync(path.join(RAIZ, archivo));
  assert.equal(b.toString('ascii', 1, 4), 'PNG', `${archivo} no es un PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

for (const lado of [192, 512]) {
  test(`el manifest tiene un ícono PNG de ${lado}×${lado} que existe`, () => {
    const icono = manifest.icons.find(i => i.sizes === `${lado}x${lado}` && i.type === 'image/png');
    assert.ok(icono, `falta el ícono PNG de ${lado}`);
    assert.doesNotMatch(icono.src, /^data:/);
    assert.deepEqual(tamañoPng(icono.src), [lado, lado]);
  });
}

test('hay favicon y ícono para iOS, y existen', () => {
  for (const rel of ['icon', 'apple-touch-icon']) {
    const m = new RegExp(`<link rel="${rel}"[^>]*href="([^"]+)"`).exec(HTML);
    assert.ok(m, `falta <link rel="${rel}">`);
    assert.ok(fs.existsSync(path.join(RAIZ, m[1])), `${m[1]} no existe`);
  }
});

test('los íconos están precacheados (la app instalada los pide sin internet)', () => {
  const iconos = manifest.icons.map(i => i.src);
  const faltan = iconos.filter(s => !precache.includes(s));
  assert.deepEqual(faltan, []);
});
