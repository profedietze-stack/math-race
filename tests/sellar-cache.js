'use strict';
// Vuelve a sellar la caché: guarda en sw-precache.json el nombre de caché que
// hay hoy en sw.js junto con la huella del contenido precacheado.
//
// Se corre DESPUÉS de subir CACHE_NAME, cuando cambió algo precacheado:
//
//   1. editar el archivo (js/, css/, index.html…)
//   2. subir CACHE_NAME en sw.js
//   3. node tests/sellar-cache.js
//
// El test `cache-version.test.js` falla si se saltea el paso 2, que es el que
// hace que el arreglo le llegue a quien ya tiene el juego instalado.

const { escribirSello, SELLO } = require('./helpers/precache-hash');

const sello = escribirSello();
console.log(`Sellado ${SELLO}`);
console.log(`  caché:  ${sello.cacheName}`);
console.log(`  huella: ${sello.huella}`);
