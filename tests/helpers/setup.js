'use strict';
// Helper para testear los scripts "clásicos" del juego (sin módulos, pensados
// para <script src> compartiendo el scope global del navegador) desde Node.
//
// Cómo funciona: cada archivo game/js/*.js expone un bloque
//   if (typeof module !== 'undefined' && module.exports) { module.exports = {...} }
// al final, que no afecta al navegador (module no existe ahí). Acá lo
// requerimos y volcamos esas funciones/constantes sobre `global`, imitando
// cómo en el navegador todos los <script> comparten el mismo scope.

const path = require('path');

const JS_DIR = path.join(__dirname, '..', '..', 'js');

function makeMockLocalStorage() {
  const store = Object.create(null);
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    _store: store,
  };
}

// Vuelve a requerir un archivo ignorando la caché de Node (para tests aislados)
function freshRequire(file) {
  const full = path.join(JS_DIR, file);
  delete require.cache[require.resolve(full)];
  return require(full);
}

function loadGameGlobals() {
  const mockLS = makeMockLocalStorage();
  global.localStorage = mockLS;

  Object.assign(global, freshRequire('utils.js'));
  Object.assign(global, freshRequire('data.js'));
  Object.assign(global, freshRequire('profiles.js'));
  Object.assign(global, freshRequire('state.js'));
  Object.assign(global, freshRequire('challenge.js'));

  return { localStorage: mockLS };
}

module.exports = { loadGameGlobals, makeMockLocalStorage, freshRequire };
