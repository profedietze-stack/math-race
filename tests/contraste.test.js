'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Contraste WCAG AA (4,5:1 para texto normal) del texto blanco sobre los
// fondos de color del juego.
//
// Medido en el navegador el 27-oct-2026: «Carrera vs IA» daba 2,8:1 (blanco
// sobre naranja), la insignia de nivel 3,8:1, y los subtítulos de los botones
// del menú salían NEGROS — `.menu-btn` no definía color y heredaba el del
// navegador. En una tablet al sol o en el proyector del aula no se leen.
//
// Se mide sobre cada parada del degradé: el texto puede caer en cualquiera.

const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
// Una variable puede valer distinto según el modo (el de alto contraste aclara
// --purple): se miden todos sus valores.
const vars = {};
for (const m of css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) (vars[m[1]] ||= []).push(m[2]);

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = rgb => {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contra = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Última regla que define `background` con degradé para el selector.
function paradas(selector) {
  const re = new RegExp(`(?:^|[}\\s,])${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`, 'g');
  let ultimo = null;
  for (const m of css.matchAll(re)) {
    const g = /background:\s*linear-gradient\(([^;]*)\);/.exec(m[1]);
    if (g) ultimo = g[1];
  }
  assert.ok(ultimo, `${selector} sin degradé`);
  return [...ultimo.matchAll(/#[0-9a-fA-F]{6}|var\(--([\w-]+)\)/g)].flatMap(m => m[1] ? vars[m[1]] : [m[0]]);
}

for (const sel of ['.btn-ai', '.btn-human', '.btn-continue', '.level-badge']) {
  test(`texto blanco sobre ${sel} llega a 4,5:1`, () => {
    for (const c of paradas(sel)) {
      const r = contra([255, 255, 255], hex(c));
      assert.ok(r >= 4.5, `${sel} ${c}: ${r.toFixed(2)}:1`);
    }
  });
}

test('los botones del menú definen su color de texto (no heredan el negro)', () => {
  const regla = /\.menu-btn\s*\{([^}]*)\}/.exec(css)[1];
  assert.match(regla, /(^|[;\s])color:\s*var\(--white\)/);
});
