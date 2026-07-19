// ═══════════════════════════════════════
//  STICKER CATALOG
//  unlockLevel: 0 = libre desde el inicio
//               N = se desbloquea al superar el nivel N en modo IA
// ═══════════════════════════════════════
const STICKERS = [
  // ── LIBRES ──
  { id: 'rocket',    emoji: '🚀', name: 'Cohete',    color: '#4cc9f0', unlockLevel: 0 },
  { id: 'star',      emoji: '⭐', name: 'Estrella',  color: '#ffd60a', unlockLevel: 0 },
  { id: 'lightning', emoji: '⚡', name: 'Rayo',      color: '#ffd60a', unlockLevel: 0 },
  { id: 'fire',      emoji: '🔥', name: 'Llama',     color: '#ff6b35', unlockLevel: 0 },
  // ── BLOQUEADOS ──
  { id: 'dragon',    emoji: '🐉', name: 'Dragón',    color: '#ff6b35', unlockLevel: 2,  hint: 'Nivel 2' },
  { id: 'lion',      emoji: '🦁', name: 'León',      color: '#ffd60a', unlockLevel: 3,  hint: 'Nivel 3' },
  { id: 'unicorn',   emoji: '🦄', name: 'Unicornio', color: '#f72585', unlockLevel: 4,  hint: 'Nivel 4' },
  { id: 'robot',     emoji: '🤖', name: 'Robot',     color: '#4cc9f0', unlockLevel: 5,  hint: 'Nivel 5' },
  { id: 'ninja',     emoji: '😎', name: 'Ninja',     color: '#7c3aed', unlockLevel: 7,  hint: 'Nivel 7' },
  { id: 'alien',     emoji: '👾', name: 'Alien',     color: '#06d6a0', unlockLevel: 9,  hint: 'Nivel 9' },
];

// AI rivals (fixed, not player-selectable)
const AI_RIVALS = [
  { id: 'cpu1', emoji: '🤖', name: 'IA-Alfa',  color: '#4cc9f0' },
  { id: 'cpu2', emoji: '👾', name: 'IA-Beta',  color: '#f72585' },
  { id: 'cpu3', emoji: '😎', name: 'IA-Gamma', color: '#7c3aed' },
];

// ops: operaciones disponibles en ese nivel. '×' desde nivel 7, '÷' desde nivel 9.
const LEVELS = [
  { min: 1, max: 10, name: 'Principiante', ops: ['+','-'] },
  { min: 1, max: 10, name: 'Principiante', ops: ['+','-'] },
  { min: 1, max: 10, name: 'Principiante', ops: ['+','-'] },
  { min: 1, max: 15, name: 'Fácil',        ops: ['+','-'] },
  { min: 1, max: 15, name: 'Fácil',        ops: ['+','-'] },
  { min: 1, max: 20, name: 'Medio',        ops: ['+','-'] },
  { min: 1, max: 30, name: 'Medio',        ops: ['+','-','×'] },
  { min: 1, max: 40, name: 'Difícil',      ops: ['+','-','×'] },
  { min: 1, max: 50, name: 'Difícil',      ops: ['+','-','×','÷'] },
  { min: 1, max: 100, name: 'Experto',     ops: ['+','-','×','÷'] }
];

// Nivel fijo usado por el Desafío Diario (mismo para todos los jugadores)
const DAILY_LEVEL_INDEX = 4; // LEVELS[4] = nivel 5, "Medio", solo +/-
const DAILY_QUESTIONS = 10;

const RACE_DISTANCE = 100;

// ═══════════════════════════════════════
//  COMENTARIOS IA — LOCAL (sin CORS)
//  Banco de frases que simulan Haiku.
//  Sin fetch → funciona desde file://
// ═══════════════════════════════════════
const COMMENTS = {
  correct: [
    '¡Genial! ¡Eres una máquina de calcular! 🚀',
    '¡Correcto! ¡Tu cerebro vuela a mil! ⭐',
    '¡Perfecto! ¡Nadie te para hoy! ⚡',
    '¡Exacto! ¡Sigue así, campeón! 🏆',
    '¡Brillante! ¡La matemática es tu superpoder! 💥',
    '¡Increíble respuesta! ¡Eres el más rápido! 🔥',
    '¡Lo sabías! ¡Tu dragón vuela más alto! 🐉',
    '¡Crack total! ¡Imparable! 👑',
  ],
  streak: [
    '¡COMBO x{n}! ¡Eres imparable! 🔥🔥',
    '¡{n} seguidas! ¡Modo bestia activado! 💪',
    '¡Racha de {n}! ¡Nadie te detiene! ⚡⚡',
    '¡{n} correctas seguidas! ¡Campeón absoluto! 🏆🏆',
  ],
  incorrect: [
    '¡Casi! La próxima la clavas 💪',
    '¡Sigue intentando, tú puedes! 🌟',
    '¡No pasa nada! Cada error enseña algo nuevo ✨',
    '¡Ánimo! ¡Tu corredor necesita que lo intentes de nuevo! 🐉',
    '¡Tranqui! Los campeones también fallan a veces 🙌',
  ],
  blocked: [
    `¡Uy! 3 errores — la respuesta era {correct}. ¡La próxima sí! 💪`,
    `¡Sin avance esta vez! Recuerda: {correct} es la clave 🔑`,
    `¡Turno perdido! Pero ya sabrás que era {correct} 🧠`,
    `¡Tranquilo! Ahora ya conoces la respuesta: {correct} ⭐`,
  ],
  fireball: [
    '¡BOOM! 🔥 ¡{target} sale disparado hacia atrás!',
    '¡Bola de fuego épica contra {target}! 💥🔥',
    '¡ATAQUE! {target} retrocede — ¡genio estratega! ⚡',
    '¡{target} no lo vio venir! ¡Demoledor! 💣',
  ],
  end_win: [
    '¡CAMPEÓN! ¡Matemáticas y velocidad, la combinación perfecta! 🏆',
    '¡Ganaste! ¡Tu cerebro es más rápido que el rayo! ⚡👑',
    '¡Primer lugar! ¡Eres una estrella de las matemáticas! ⭐🥇',
    '¡Victoria total! ¡Sigue practicando y serás imbatible! 🔥🏆',
  ],
  end_lose: [
    '¡Buen intento! ¡La próxima carrera es tuya! 💪🚀',
    '¡Gran esfuerzo! ¡Sigue entrenando tu súper cerebro! 🧠⭐',
    '¡Casi! ¡Una más y llegas primero! 🏁🔥',
    '¡No te rindas! ¡Los campeones siguen intentando! 👑💥',
  ],
};

// ═══════════════════════════════════════
//  ACHIEVEMENTS
// ═══════════════════════════════════════
const ACHIEVS = [
  { id: 'firstWin',    icon: '🏆', name: 'Primera Victoria',  desc: 'Gana una carrera vs IA' },
  { id: 'allLevels',   icon: '👑', name: 'Rey del Cálculo',    desc: 'Completa el nivel 10 vs IA' },
  { id: 'speedMath',   icon: '⚡', name: 'Mente Veloz',        desc: '5 respuestas correctas seguidas' },
  { id: 'fireballer',  icon: '🔥', name: 'Maestro del Fuego',  desc: 'Usa 5 bolas de fuego en una carrera vs IA' },
  { id: 'halfwayHero', icon: '🎯', name: 'A Mitad de Camino',  desc: 'Supera el nivel 5 vs IA' },
  { id: 'perfectRace', icon: '💎', name: 'Carrera Perfecta',   desc: '100% de precisión en una carrera vs IA' },
  { id: 'comeback',    icon: '🦅', name: 'Remontada Épica',    desc: 'Gana estando último en algún turno vs IA' },
  { id: 'unstoppable', icon: '💨', name: 'Imparable',          desc: 'Gana 3 carreras seguidas vs IA' },
];

// ═══════════════════════════════════════
//  PROBLEMAS CON ENUNCIADO
//  {n1} y {n2} se reemplazan por los números de la pregunta actual.
// ═══════════════════════════════════════
const WORD_PROBLEMS = {
  '+': [
    'Tenés {n1} caramelos y comprás {n2} más. ¿Cuántos tenés en total?',
    'Hay {n1} pájaros en un árbol y llegan {n2} más. ¿Cuántos hay ahora?',
    '{n1} amigos juegan en la plaza y se suman {n2} más. ¿Cuántos son?',
    'Tenías {n1} figuritas y te regalan {n2}. ¿Cuántas tenés ahora?',
  ],
  '-': [
    'Tenés {n1} figuritas y regalás {n2}. ¿Cuántas te quedan?',
    'Hay {n1} globos y se explotan {n2}. ¿Cuántos quedan?',
    'Tenías {n1} caramelos y comiste {n2}. ¿Cuántos quedan?',
    'Había {n1} pájaros y volaron {n2}. ¿Cuántos quedan en el árbol?',
  ],
  '×': [
    'Hay {n1} bolsas con {n2} manzanas cada una. ¿Cuántas manzanas hay en total?',
    '{n1} equipos de {n2} jugadores cada uno. ¿Cuántos jugadores en total?',
    'Comprás {n1} paquetes de {n2} alfajores. ¿Cuántos alfajores comprás?',
  ],
  '÷': [
    'Repartís {n1} caramelos entre {n2} amigos en partes iguales. ¿Cuántos le tocan a cada uno?',
    'Tenés {n1} figuritas y armás grupos de {n2}. ¿Cuántos grupos formás?',
    '{n1} alumnos se dividen en equipos de {n2}. ¿Cuántos equipos se forman?',
  ],
};

// ── Exports condicionales para tests en Node (no afecta al navegador) ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STICKERS, AI_RIVALS, LEVELS, DAILY_LEVEL_INDEX, DAILY_QUESTIONS,
    RACE_DISTANCE, COMMENTS, ACHIEVS, WORD_PROBLEMS,
  };
}
