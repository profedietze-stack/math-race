'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// El juego le habla al chico de vos, en todas las pantallas.
//
// Estaba mezclado: «Elige tu corredor», «¡Eres una máquina!» y «Tenés 5
// caramelos» convivían en la misma carrera. El juego es para primarias
// argentinas, y la voz tiene que ser una sola.
//
// Se recorren TODOS los .js, el HTML y el manifest (un archivo nuevo entra
// solo), sin los comentarios: el código puede decir «sigue» en un comentario.

const RAIZ = path.join(__dirname, '..');
const archivos = [
  'index.html', 'manifest.json',
  ...fs.readdirSync(path.join(RAIZ, 'js')).filter(f => f.endsWith('.js')).map(f => `js/${f}`),
];

function sinComentarios(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

// Formas de tú que en voseo cambian. Cada una con su reemplazo, para que el
// mensaje del test diga qué poner.
const TUTEO = {
  Elige: 'Elegí', Eres: 'Sos', Resuelve: 'Resolvé', Compite: 'Competí', Gana: 'Ganá',
  Responde: 'Respondé', Necesitas: 'Necesitás', Ingresa: 'Ingresá', Sigue: 'Seguí',
  puedes: 'podés', clavas: 'clavás', Retoma: 'Retomá', Supera: 'Superá',
  Recuerda: 'Acordate', conoces: 'conocés', Usa: 'Usá', Completa: 'Completá',
  Tú: 'Vos', tú: 'vos', Tienes: 'Tenés', tienes: 'tenés', Juega: 'Jugá', Intenta: 'Intentá',
};

test('ningún texto del juego usa tuteo', () => {
  const hallazgos = [];
  for (const f of archivos) {
    const src = sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'));
    src.split('\n').forEach((linea, i) => {
      for (const [tu, vos] of Object.entries(TUTEO)) {
        // Sensible a mayúsculas: «Juega» imperativo sí, «¿Quién juega?» no;
        // «Completa el nivel» sí, «Vuelta completa» no.
        const re = new RegExp(`(^|[^\\p{L}])${tu}(?![\\p{L}])`, 'u');
        if (re.test(linea)) hallazgos.push(`${f}:${i + 1} «${tu}» → «${vos}»`);
      }
    });
  }
  assert.deepEqual(hallazgos, []);
});
