'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadGameGlobals } = require('./helpers/setup');

loadGameGlobals();

const CHALLENGE_JS = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'challenge.js'), 'utf8',
);

// La división no tenía dibujo, y caía en el de la suma.
//
// El juego dibuja cada operación con puntos, y eso es su idea entera: el chico
// ve la cuenta antes de resolverla. La resta tiene su dibujo propio —un solo
// grupo con los últimos puntos tachados— y la multiplicación el suyo —n1 filas
// de n2 puntos—, y los dos están comentados en el código explicando que dos
// montones sueltos con un signo en el medio no representan la operación.
//
// La división caía justo en ese caso: el `else` del template, o sea el mismo
// dibujo que la suma. En pantalla, «12 ÷ 3» se veía como doce puntos, un signo
// y tres puntos, que es exactamente lo que el comentario de la multiplicación
// dice que está mal. Y aparece desde el nivel 9 en adelante.

test('el dibujo de división reparte n1 en n2 grupos iguales', () => {
  const html = buildSharingDotGrid(12, 3);
  const puntos = (html.match(/dot dot-blue/g) || []).length;
  assert.equal(puntos, 12, 'tienen que estar los 12 puntos a repartir');
  const grupos = (html.match(/class="sharing-group"/g) || []).length;
  assert.equal(grupos, 3, 'tienen que verse los 3 grupos entre los que se reparte');
});

test('cada grupo tiene la misma cantidad, que es la respuesta', () => {
  const html = buildSharingDotGrid(12, 3);
  const porGrupo = html
    .split('class="sharing-group"')
    .slice(1)
    .map(g => (g.match(/dot dot-blue/g) || []).length);
  assert.deepEqual(porGrupo, [4, 4, 4], 'los grupos tienen que quedar parejos');
});

test('con números grandes recorta grupos, nunca lo que hay dentro de uno', () => {
  // Nivel 10 con boost: 12 × 12 = 144 puntos. Dibujarlos todos no entra, pero
  // el recorte tiene que caer sobre la cantidad de grupos: si se recortan los
  // puntos de cada grupo, el chico no puede contar ninguno, y contar un grupo
  // ES la respuesta.
  const html = buildSharingDotGrid(144, 12);
  const porGrupo = html
    .split('class="sharing-group"')
    .slice(1)
    .map(g => (g.match(/dot dot-blue/g) || []).length);
  assert.ok(porGrupo.length < 12, 'tendría que mostrar menos grupos de los que hay');
  porGrupo.forEach(n => assert.equal(n, 12, 'un grupo quedó incompleto'));
  assert.ok(html.includes('grupos más'), 'tiene que avisar cuántos grupos quedaron sin dibujar');
});

test('63 ÷ 7: los grupos que se ven están completos', () => {
  // El caso que lo destapó: 7 grupos de 9. Con el corte anterior se veían seis
  // grupos de ocho puntos y un «+1» en cada uno.
  const html = buildSharingDotGrid(63, 7);
  const porGrupo = html
    .split('class="sharing-group"')
    .slice(1)
    .map(g => (g.match(/dot dot-blue/g) || []).length);
  porGrupo.forEach(n => assert.equal(n, 9));
  assert.ok(!/\+\d+<\/span>/.test(html), 'quedó un «+N» dentro de un grupo');
});

test('no rompe con divisores raros', () => {
  // No deberían llegar del generador, pero el dibujo no puede tirar por eso.
  for (const [n1, n2] of [[0, 3], [5, 0], [7, 1], [3, 5]]) {
    assert.doesNotThrow(() => buildSharingDotGrid(n1, n2), `${n1} ÷ ${n2}`);
  }
});

test('la pantalla de la pregunta usa el dibujo de división', () => {
  // Si el dibujo existe pero el template no lo llama, el alumno sigue viendo
  // el de la suma: el arreglo tiene que llegar a la pantalla.
  const visual = CHALLENGE_JS.slice(
    CHALLENGE_JS.indexOf('class="visual-math"'),
    CHALLENGE_JS.indexOf('class="answers-grid"'),
  );
  assert.ok(visual.length > 0, 'no se encontró el bloque visual-math');
  assert.ok(
    visual.includes("ch.op === '÷'"),
    'el template no distingue la división: cae en el mismo dibujo que la suma',
  );
  assert.ok(
    visual.includes('buildSharingDotGrid'),
    'el template no usa el dibujo de reparto',
  );
});

test('y el generador sigue produciendo divisiones exactas para ese dibujo', () => {
  // El dibujo sólo tiene sentido si la división es exacta. Lo es, y este test
  // lo ata: si algún día deja de serlo, los grupos no quedarían parejos.
  const lv = { min: 1, max: 50, ops: ['÷'] };
  for (let i = 0; i < 100; i++) {
    const ch = generateChallenge(lv, 0, rand, pick, shuffle);
    assert.equal(ch.n1 % ch.n2, 0);
    const html = buildSharingDotGrid(ch.n1, ch.n2);
    const porGrupo = html
      .split('class="sharing-group"')
      .slice(1)
      .map(g => (g.match(/dot dot-blue/g) || []).length);
    assert.equal(new Set(porGrupo).size, 1, `${ch.n1} ÷ ${ch.n2} dio grupos desparejos`);
  }
});
