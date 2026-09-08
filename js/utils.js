// ═══════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
// Fisher-Yates, el mismo que `sshuffle` pero con Math.random.
//
// Antes era `[...arr].sort(() => Math.random() - 0.5)`: un comparador
// inconsistente que no reparte parejo y deja los elementos cerca de donde
// estaban. Quedaba la rareza de que el Desafio Diario —que usa `sshuffle`—
// mezclaba bien las respuestas y el modo normal no.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── RNG seedeada (Desafío Diario: misma secuencia de preguntas para todos) ──
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function todaySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
// Misma clave que todayKey() pero para "hace N días" (usado en el historial semanal)
function dateKeyOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
function srand(rnd, min, max) { return Math.floor(rnd() * (max - min + 1)) + min; }
function spick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
function sshuffle(rnd, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Sanitiza texto libre (nombres de jugadores) antes de insertarlo vía innerHTML.
// Escape manual de caracteres (no depende del DOM -> testeable en Node y en el navegador).
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── ROBUSTEZ ─────────────────────────────────────────
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

// ── PERFILES: namespacing de claves de localStorage por jugador activo ──
// Sin perfil elegido, pKey devuelve la clave "pelada" (compatibilidad con
// partidas guardadas de antes de que existieran los perfiles).
//
// Se cuelga de globalThis (no un simple `let` de módulo) a propósito: en el
// navegador todos los <script> comparten el mismo scope global igual, pero
// en Node (tests) cada archivo requerido es su propio módulo aislado —
// globalThis es lo único que de verdad comparten profiles.js y utils.js ahí.
if (typeof globalThis.currentProfileId === 'undefined') {
  globalThis.currentProfileId = (typeof localStorage !== 'undefined')
    ? (localStorage.getItem('activeProfileId') || null)
    : null;
}
function pKey(base) {
  return globalThis.currentProfileId ? `p_${globalThis.currentProfileId}_${base}` : base;
}

// ── VOLUMEN: música y efectos por separado (ajuste de dispositivo, no por perfil) ──
function getMusicVolumePct() {
  const v = parseInt(localStorage.getItem('musicVolume'), 10);
  return Number.isFinite(v) ? clamp(v, 0, 100) : 80;
}
function getSfxVolumePct() {
  const v = parseInt(localStorage.getItem('sfxVolume'), 10);
  return Number.isFinite(v) ? clamp(v, 0, 100) : 80;
}
// 100% -> 0dB extra, 0% -> -40dB (casi silencio). Se suma al volumen base de cada synth.
function musicVolumeOffsetDb() { return (getMusicVolumePct() - 100) * 0.4; }
// 100% -> ganancia normal, 0% -> silencio total en los efectos (Web Audio, no dB)
function sfxVolumeMult() { return getSfxVolumePct() / 100; }

// Lee y parsea JSON de localStorage con fallback seguro ante datos corruptos.
function safeGetJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

// Guarda en localStorage sin tirar la app si falla (cuota excedida, modo privado, etc.)
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

let toastTimeout;
function toast(msg, type = 'ok') {
  let el = document.getElementById('toastEl');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toastEl';
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:12px;font-weight:800;font-size:0.85rem;z-index:999;max-width:90vw;text-align:center;transition:opacity 0.3s;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.onclick = null;
  el.style.cursor = 'default';
  el.style.background = type === 'ok' ? 'rgba(6,214,160,0.95)' : 'rgba(239,35,60,0.95)';
  el.style.color = type === 'ok' ? '#000' : '#fff';
  el.style.opacity = '1';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { el.style.opacity = '0'; }, 2200);
}

// ── Exports condicionales para tests en Node (no afecta al navegador) ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    rand, pick, shuffle, mulberry32, todaySeed, todayKey, dateKeyOffset,
    srand, spick, sshuffle, escapeHtml, clamp, safeGetJSON, safeSetItem,
    pKey, getMusicVolumePct, getSfxVolumePct, musicVolumeOffsetDb, sfxVolumeMult,
    setCurrentProfileId: (id) => { globalThis.currentProfileId = id; }, // solo para tests
  };
}
