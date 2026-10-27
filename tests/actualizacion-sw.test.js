'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// «Hay una versión nueva — tocá para actualizar» no actualizaba.
//
// Al tocar el aviso se le pedía al service worker nuevo que tomara el control
// y, en la misma línea, se recargaba la página. La recarga ganaba: la página
// volvía a abrir con el service worker viejo, que todavía no había soltado el
// control, y el aviso aparecía otra vez. Había que tocarlo dos veces, y el
// docente no tiene por qué saberlo.
//
// La recarga tiene que esperar a `controllerchange`, que es cuando el nuevo
// ya está a cargo. Y sólo si había uno antes: en la primera visita también
// cambia el controlador (el service worker se instala por primera vez), y
// recargar ahí sería un parpadeo sin sentido.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const SCRIPT_SW = scripts.find(s => s.includes('serviceWorker.register'));

function entorno({ habiaControlador, waiting }) {
  const escuchas = {};
  const registro = {
    waiting,
    installing: null,
    addEventListener() {},
  };
  const toastEl = { style: {}, onclick: null };
  const ctx = {
    recargas: 0,
    toastEl,
    navigator: {
      serviceWorker: {
        controller: habiaControlador ? {} : null,
        register: () => Promise.resolve(registro),
        addEventListener: (ev, fn) => { (escuchas[ev] = escuchas[ev] || []).push(fn); },
      },
    },
    document: { getElementById: (id) => (id === 'toastEl' ? toastEl : null) },
    toast: () => {},
  };
  ctx.window = {
    location: { reload: () => { ctx.recargas++; } },
    addEventListener: (ev, fn) => { if (ev === 'load') ctx.alCargar = fn; },
  };
  ctx.disparar = (ev) => (escuchas[ev] || []).forEach(fn => fn());
  vm.createContext(ctx);
  vm.runInContext(SCRIPT_SW, ctx);
  return ctx;
}

async function cargar(ctx) {
  ctx.alCargar();
  await new Promise(r => setImmediate(r));
}

test('tocar el aviso pide el cambio pero no recarga antes de tiempo', async () => {
  const mensajes = [];
  const ctx = entorno({ habiaControlador: true, waiting: { postMessage: (m) => mensajes.push(m) } });
  await cargar(ctx);
  assert.equal(typeof ctx.toastEl.onclick, 'function', 'no apareció el aviso de versión nueva');
  ctx.toastEl.onclick();
  assert.deepEqual(mensajes, ['skipWaiting']);
  assert.equal(ctx.recargas, 0, 'recargó antes de que el service worker nuevo tomara el control');
});

test('cuando el nuevo toma el control, recarga una sola vez', async () => {
  const ctx = entorno({ habiaControlador: true, waiting: { postMessage() {} } });
  await cargar(ctx);
  ctx.toastEl.onclick();
  ctx.disparar('controllerchange');
  ctx.disparar('controllerchange');
  assert.equal(ctx.recargas, 1);
});

test('en la primera visita (sin service worker previo) no recarga', async () => {
  const ctx = entorno({ habiaControlador: false, waiting: null });
  await cargar(ctx);
  ctx.disparar('controllerchange');
  assert.equal(ctx.recargas, 0);
});
