// ═══════════════════════════════════════
//  STATE
// ═══════════════════════════════════════

// Nivel guardado: si localStorage tiene basura corrupta o fuera de rango, cae a 1.
// (namespaced por perfil vía pKey — ver utils.js)
function readSavedLevel() {
  const n = parseInt(localStorage.getItem(pKey('savedLevel')), 10);
  return Number.isFinite(n) ? clamp(n, 1, 10) : 1;
}

const DEFAULT_STATS = { races: 0, correct: 0, total: 0, opMisses: {} };

// globalThis.state (no `let state`) a propósito: en Node cada archivo
// requerido es un módulo aislado, y otros archivos (profiles.js, actions.js,
// etc.) necesitan ver el mismo `state` — ver la nota de currentProfileId
// en utils.js para más detalle. En el navegador se comporta igual que `let`.
globalThis.state = {
  level: readSavedLevel(),
  mode: 'ai',
  dragons: [],
  positions: [],
  currentChallenge: null,
  currentTurn: 0,
  gameActive: false,
  achievements: safeGetJSON(pKey('achievements'), {}),
  streak: 0,
  correctCount: 0,
  totalCount: 0,
  wrongStreak: 0,
  fireballCount: 0,  // acumulado en la sesión
  // sticker selection
  selectedStickerId: localStorage.getItem(pKey('selectedSticker')) || 'rocket',
  humanPlayers: [], // [{name, stickerId}]
  // dificultad adaptativa dentro de la carrera (0-3, sube con racha, baja con error)
  difficultyBoost: 0,
  // desafío diario
  dailyRng: null,
  dailyIndex: 0,
  // conteo de errores por operación en la carrera actual (para stats)
  opMisses: {},
};

// Which stickers are unlocked based on max AI level reached
function getUnlockedStickerIds() {
  const maxLevel = clamp(parseInt(localStorage.getItem(pKey('maxAILevel')), 10) || 0, 0, 10);
  return STICKERS.filter(s => s.unlockLevel === 0 || maxLevel >= s.unlockLevel).map(s => s.id);
}
function getStickerById(id) { return STICKERS.find(s => s.id === id) || STICKERS[0]; }

// ═══════════════════════════════════════
//  ESTADÍSTICAS HISTÓRICAS
// ═══════════════════════════════════════
function normalizeStats(raw) {
  // OJO: nunca devolver una referencia compartida (ej. DEFAULT_STATS.opMisses) —
  // el llamador muta el objeto devuelto, así que siempre hay que copiarlo.
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { races: 0, correct: 0, total: 0, opMisses: {} };
  return {
    races: Number.isFinite(raw.races) ? raw.races : 0,
    correct: Number.isFinite(raw.correct) ? raw.correct : 0,
    total: Number.isFinite(raw.total) ? raw.total : 0,
    opMisses: (raw.opMisses && typeof raw.opMisses === 'object' && !Array.isArray(raw.opMisses)) ? { ...raw.opMisses } : {},
  };
}

function recordRaceStats(opMisses, correctCount, totalCount) {
  const stats = normalizeStats(safeGetJSON(pKey('statsHistory'), DEFAULT_STATS));
  stats.races++;
  stats.correct += (Number.isFinite(correctCount) ? correctCount : 0);
  stats.total += (Number.isFinite(totalCount) ? totalCount : 0);
  Object.entries(opMisses || {}).forEach(([op, n]) => {
    stats.opMisses[op] = (stats.opMisses[op] || 0) + n;
  });
  safeSetItem(pKey('statsHistory'), JSON.stringify(stats));
  recordDailyStatsLog(Number.isFinite(correctCount) ? correctCount : 0, Number.isFinite(totalCount) ? totalCount : 0);
}

/**
 * Guarda las estadísticas de la carrera en curso, una sola vez.
 *
 * Se guardaban en tres lugares —al terminar una carrera, al terminar el
 * Desafío Diario, y al salir sólo en modo práctica—, así que el alumno que
 * jugaba veinte preguntas contra la IA y cerraba antes de llegar a los 100
 * metros no dejaba rastro. En un aula esa es la situación normal: suena el
 * timbre y treinta tablets se cierran a mitad de carrera.
 *
 * La marca `_statsGuardadas` evita el problema contrario: que una carrera que
 * terminó sola y además se cierra con Salir cuente dos veces.
 *
 * Devuelve si efectivamente guardó, para poder probarlo.
 */
function guardarEstadisticasDeCarrera() {
  if (state._statsGuardadas) return false;
  if (!(state.totalCount > 0)) return false; // entrar y salir sin contestar no es un día jugado
  state._statsGuardadas = true;
  recordRaceStats(state.opMisses, state.correctCount, state.totalCount);
  return true;
}

function getStatsHistory() {
  return normalizeStats(safeGetJSON(pKey('statsHistory'), DEFAULT_STATS));
}

function getWeakestOp() {
  const stats = getStatsHistory();
  const entries = Object.entries(stats.opMisses);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

// ── Historial semanal (últimos 7 días de precisión) ──
function normalizeStatsLog(raw) {
  return (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
}

function recordDailyStatsLog(correctCount, totalCount) {
  if (totalCount <= 0) return;
  const log = normalizeStatsLog(safeGetJSON(pKey('dailyStatsLog'), {}));
  const key = todayKey();
  const entry = log[key] && typeof log[key] === 'object' ? log[key] : { correct: 0, total: 0 };
  entry.correct = (Number.isFinite(entry.correct) ? entry.correct : 0) + correctCount;
  entry.total = (Number.isFinite(entry.total) ? entry.total : 0) + totalCount;
  log[key] = entry;
  // Poda: no dejar crecer el log para siempre, con 60 días alcanza y sobra
  const cutoff = dateKeyOffset(60);
  Object.keys(log).forEach(k => { if (k < cutoff) delete log[k]; });
  safeSetItem(pKey('dailyStatsLog'), JSON.stringify(log));
}

// Últimos 7 días, del más viejo al más nuevo. accuracy es null si ese día no se jugó.
function getWeeklyStats() {
  const log = normalizeStatsLog(safeGetJSON(pKey('dailyStatsLog'), {}));
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const key = dateKeyOffset(i);
    const entry = log[key];
    const accuracy = (entry && entry.total > 0) ? Math.round((entry.correct / entry.total) * 100) : null;
    days.push({ key, accuracy });
  }
  return days;
}

// ── Exports condicionales para tests en Node (no afecta al navegador) ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeStats, DEFAULT_STATS, readSavedLevel,
    getUnlockedStickerIds, getStickerById,
    recordRaceStats, guardarEstadisticasDeCarrera, getStatsHistory, getWeakestOp,
    normalizeStatsLog, recordDailyStatsLog, getWeeklyStats,
  };
}
