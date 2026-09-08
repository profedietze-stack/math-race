'use strict';
// Banner global de errores.
//
// Sin esto, un error de `window` o una promesa sin atender dejan el juego a
// medias sin decir nada: la carrera no arranca, el chico toca y no pasa nada, y
// el docente no tiene ni qué contar. El banner se puede tocar para copiar el
// detalle.
//
// Va primero de todos los <script> a propósito: si algo se rompe al cargar
// cualquiera de los otros módulos, el banner ya está escuchando.
//
// No es un módulo ES: el resto del juego son <script> clásicos.
(function () {
  var BANNER_ID = '__error_banner__';

  function show(title, detail) {
    if (document.getElementById(BANNER_ID)) return;

    var banner = document.createElement('div');
    banner.id = BANNER_ID;
    var estilo = {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      zIndex: '99999',
      background: 'linear-gradient(135deg,#7b0000,#c0392b)',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '13px',
      padding: '12px 48px 12px 16px',
      lineHeight: '1.5',
      boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
      cursor: 'pointer',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all'
    };
    for (var k in estilo) { if (Object.prototype.hasOwnProperty.call(estilo, k)) banner.style[k] = estilo[k]; }

    banner.textContent = '⚠ ERROR — toca para copiar\n' + title + '\n' + detail;

    var cerrar = document.createElement('button');
    var estiloCerrar = {
      position: 'absolute', top: '8px', right: '10px', background: 'none',
      border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', lineHeight: '1'
    };
    for (var c in estiloCerrar) { if (Object.prototype.hasOwnProperty.call(estiloCerrar, c)) cerrar.style[c] = estiloCerrar[c]; }
    cerrar.textContent = '✕';
    cerrar.onclick = function (e) { e.stopPropagation(); banner.remove(); };

    banner.onclick = function () {
      if (navigator.clipboard) navigator.clipboard.writeText(title + '\n' + detail).catch(function () {});
    };

    banner.appendChild(cerrar);
    // `document.body` puede no existir todavía si el error ocurre al cargar los
    // primeros scripts: en ese caso se espera al DOM.
    if (document.body) document.body.prepend(banner);
    else document.addEventListener('DOMContentLoaded', function () { document.body.prepend(banner); });
  }

  window.addEventListener('error', function (e) {
    var detail = (e.error && e.error.stack) ? e.error.stack : (e.filename + ':' + e.lineno + ':' + e.colno);
    show(e.message, detail);
  });

  window.addEventListener('unhandledrejection', function (e) {
    var reason = (e.reason instanceof Error)
      ? (e.reason.message + '\n' + (e.reason.stack || ''))
      : String(e.reason);
    show('Unhandled Promise rejection', reason);
  });
})();
