// ═══════════════════════════════════════
//  CHALLENGE
// ═══════════════════════════════════════

// Generación pura de una pregunta — sin DOM, sin state global.
// Recibe el nivel, el boost de dificultad y las funciones RNG a usar
// (normales o seedeadas, según el modo). Testeable de forma aislada.
function generateChallenge(lv, boost, _rand, _pick, _shuffle) {
  const max = lv.max + (boost || 0) * Math.ceil(lv.max * 0.15);
  const op = _pick(lv.ops);
  let n1, n2, correct;

  if (op === '+') {
    n1 = _rand(lv.min, max); n2 = _rand(lv.min, max);
    correct = n1 + n2;
  } else if (op === '-') {
    n1 = _rand(lv.min, max); n2 = _rand(lv.min, max);
    correct = n1 - n2;
    if (correct < 0) { [n1, n2] = [n2, n1]; correct = n1 - n2; }
    if (correct < 0) { correct = 0; n2 = n1; }
  } else if (op === '×') {
    // La progresión adaptativa también sube la tabla: boost 3 -> factores hasta 12
    const factorMax = Math.min(12, 10 + Math.floor((boost || 0) * 0.7));
    n1 = _rand(2, factorMax); n2 = _rand(2, factorMax);
    correct = n1 * n2;
  } else { // ÷ — siempre división exacta
    const factorMax = Math.min(12, 10 + Math.floor((boost || 0) * 0.7));
    n2 = _rand(2, factorMax); correct = _rand(2, factorMax); n1 = n2 * correct;
  }

  // Distractores a 8 o menos de la correcta, eligiendo primero CUÁNTOS van por
  // debajo (0 a 3, parejo). Antes salían al azar de correcta ± 8: simétricos,
  // así que la correcta quedaba en el medio de las cuatro (2ª o 3ª más chica el
  // 78 % de las veces, la mayor sólo el 6-9 %). La posición en pantalla ya se
  // barajaba; lo que delataba la respuesta era el tamaño.
  // Con un resultado chico (0, 1, 2) no hay tantos naturales por debajo:
  // ahí ser la menor es inevitable, y los que faltan van por arriba.
  const debajo = [], arriba = [];
  for (let w = Math.max(0, correct - 8); w < correct; w++) debajo.push(w);
  for (let w = correct + 1; w <= correct + 8; w++) arriba.push(w);
  const cuantosDebajo = Math.min(_rand(0, 3), debajo.length);
  const wrongs = new Set([
    ..._shuffle(debajo).slice(0, cuantosDebajo),
    ..._shuffle(arriba).slice(0, 3 - cuantosDebajo),
  ]);
  // Red de seguridad: si por algún motivo no se juntaron 3 distractores
  // (rango demasiado angosto), se completa con offsets fijos para no colgar el juego.
  let filler = 1;
  while (wrongs.size < 3) {
    const w = Math.max(0, correct + filler);
    if (w !== correct) wrongs.add(w);
    filler = filler > 0 ? -filler : -filler + 1;
  }

  const answers = _shuffle([correct, ...wrongs]);
  return { n1, n2, op, correct, answers };
}

function loadChallenge() {
  if (!state.gameActive) return;

  // Desafío diario: nivel fijo + RNG seedeada -> misma secuencia para todos
  const isDaily = state.mode === 'daily';
  const rnd = isDaily ? state.dailyRng : null;
  const _rand = isDaily ? (a, b) => srand(rnd, a, b) : rand;
  const _pick = isDaily ? (arr) => spick(rnd, arr) : pick;
  const _shuffle = isDaily ? (arr) => sshuffle(rnd, arr) : shuffle;

  const lv = isDaily ? LEVELS[DAILY_LEVEL_INDEX] : LEVELS[state.level - 1];

  // Progresión adaptativa dentro de la carrera (no aplica al desafío diario, debe ser parejo)
  const boost = (!isDaily && (state.mode === 'ai' || state.mode === 'practice')) ? (state.difficultyBoost || 0) : 0;

  const generated = generateChallenge(lv, boost, _rand, _pick, _shuffle);

  // Problema con enunciado (ocasional, solo IA/práctica — en humano priorizamos
  // ver de quién es el turno, y en el diario la pregunta debe ser igual para todos)
  let wordProblem = null;
  if ((state.mode === 'ai' || state.mode === 'practice') && WORD_PROBLEMS[generated.op] && Math.random() < 0.35) {
    const bank = WORD_PROBLEMS[generated.op];
    wordProblem = bank[Math.floor(Math.random() * bank.length)]
      .replace('{n1}', generated.n1).replace('{n2}', generated.n2);
  }

  state.currentChallenge = { ...generated, wordProblem, answered: false, selectedAnswer: null };
  state.wrongStreak = 0; // reset penalty counter for new question
  clearFeedback();
  if (isDaily) updateLevelBadge();

  renderChallenge();
}

// Después de resolver una jugada, avanza a la siguiente pregunta — salvo en
// modo humano, donde primero hay que confirmar que se pasó el dispositivo.
function proceedToNextChallenge(delay = 0) {
  const carrera = state.carreraId;
  const run = () => {
    if (!state.gameActive || state.carreraId !== carrera) return;
    if (state.mode === 'human') showPassDeviceScreen();
    else loadChallenge();
  };
  if (delay > 0) setTimeout(run, delay); else run();
}

// ── Exports condicionales para tests en Node (no afecta al navegador) ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateChallenge, buildRemovalDotGrid, buildGroupsDotGrid, buildSharingDotGrid, selectAnswer, hayRivales };
}

// Práctica y Desafío Diario se corren solos: ahí la bola de fuego no tiene a
// quién pegarle, así que no se ofrece.
function hayRivales(dragons) { return Array.isArray(dragons) && dragons.length > 1; }

function renderChallenge(isFireball = false) {
  const ch = state.currentChallenge;
  const zone = document.getElementById('challengeZone');

  const turnLabel = state.mode === 'human'
    ? `<div class="challenge-title">Turno de: <strong style="color:var(--yellow)">${escapeHtml(state.dragons[state.currentTurn].name)} ${state.dragons[state.currentTurn].emoji}</strong></div>`
    : `<div class="challenge-title">Resuelve y Avanza 🐉</div>`;

  const wordProblemHtml = ch.wordProblem
    ? `<div class="word-problem">📖 ${ch.wordProblem}</div>`
    : '';

  zone.innerHTML = `
    <div class="challenge-header">
      ${turnLabel}
      <div style="display:flex;align-items:center;gap:8px;">
        <div class="penalty-hearts" id="penaltyHearts"></div>
        <div class="challenge-badge ${isFireball ? 'fireball' : ''}">${isFireball ? '🔥 Ataque' : '⬆️ Mover'}</div>
      </div>
    </div>

    ${wordProblemHtml}

    <div class="visual-math">
      ${ch.op === '-' ? `
        <div class="num-block subtraction-block">
          <div class="dot-grid removal-grid">${buildRemovalDotGrid(ch.n1, ch.n2)}</div>
          <div class="big-number num-a">${ch.n1}</div>
          <div class="subtraction-caption">✕ quitamos ${ch.n2}</div>
        </div>
        <div class="math-operator">−</div>
        <div class="big-number num-b">${ch.n2}</div>
      ` : ch.op === '÷' ? `
        <div class="num-block">
          <div class="dot-grid">${buildSharingDotGrid(ch.n1, ch.n2)}</div>
          <div class="subtraction-caption" style="color:var(--text-muted);">${ch.n1} repartidos en ${ch.n2} grupos iguales</div>
        </div>
        <div class="math-operator">÷</div>
        <div class="big-number num-b">${ch.n2}</div>
      ` : ch.op === '×' ? `
        <div class="num-block">
          <div class="dot-grid">${buildGroupsDotGrid(ch.n1, ch.n2)}</div>
          <div class="subtraction-caption" style="color:var(--text-muted);">${ch.n1} grupos de ${ch.n2}</div>
        </div>
        <div class="math-operator">×</div>
        <div class="big-number num-b">${ch.n2}</div>
      ` : `
        <div class="num-block">
          <div class="dot-grid" id="dots-a">${buildDotGrid(ch.n1, 'dot-blue')}</div>
          <div class="big-number num-a">${ch.n1}</div>
        </div>
        <div class="math-operator">${ch.op}</div>
        <div class="num-block">
          <div class="dot-grid" id="dots-b">${buildDotGrid(ch.n2, 'dot-orange')}</div>
          <div class="big-number num-b">${ch.n2}</div>
        </div>
      `}
    </div>

    <div class="answers-grid" id="answersGrid"></div>

    <div class="action-row">
      <button class="action-btn btn-move" onclick="doMove()">🏁 Avanzar</button>
      ${hayRivales(state.dragons) ? `<button class="action-btn btn-fire" onclick="doFireball()">🔥 Bola de fuego</button>` : ''}
    </div>

    <div class="ai-response" id="aiComment">
      <span class="ai-icon">🤖</span>
      <span id="aiText">¡Elige la respuesta correcta!</span>
    </div>
  `;

  renderAnswerBtns();
}

function buildDotGrid(n, cls) {
  const show = Math.min(n, 20);
  const cols = Math.min(show, 5);
  let html = `<div style="display:flex;flex-wrap:wrap;gap:3px;max-width:${cols*13}px;justify-content:center;">`;
  for (let i = 0; i < show; i++) {
    html += `<div class="dot ${cls}"></div>`;
  }
  if (n > 20) html += `<div class="dot-plus dot" style="width:auto;padding:0 3px;font-size:0.55rem;">+${n-20}</div>`;
  html += '</div>';
  return html;
}

// Visual de multiplicación: n1 "filas" (grupos) de n2 puntos cada una —
// representa el modelo real de multiplicar, no dos cantidades sueltas.
function buildGroupsDotGrid(n1, n2) {
  const rowsShow = Math.min(n1, 6);
  const colsShow = Math.min(n2, 10);
  let html = '<div style="display:flex;flex-direction:column;gap:3px;align-items:center;">';
  for (let r = 0; r < rowsShow; r++) {
    html += '<div style="display:flex;gap:3px;">';
    for (let c = 0; c < colsShow; c++) html += `<div class="dot dot-blue"></div>`;
    if (n2 > colsShow) html += `<span class="dot-plus dot" style="width:auto;padding:0 3px;font-size:0.5rem;">+${n2-colsShow}</span>`;
    html += '</div>';
  }
  if (n1 > rowsShow) html += `<div style="font-size:0.55rem;color:var(--text-muted);font-weight:800;margin-top:2px;">+${n1-rowsShow} filas más</div>`;
  html += '</div>';
  return html;
}

// Visual de resta: UN solo grupo de n1 puntos, donde los últimos n2
// aparecen "tachados" (vacíos + cruz) representando lo que se quita.
// Mucho más claro para chicos que dos grupos separados con un signo "-" en medio.
function buildRemovalDotGrid(n1, n2) {
  const totalShow = Math.min(n1, 20);
  const removeShow = Math.min(n2, totalShow);
  const keepShow = totalShow - removeShow;
  const cols = Math.min(totalShow, 5);
  let html = `<div style="display:flex;flex-wrap:wrap;gap:3px;max-width:${cols*13}px;justify-content:center;">`;
  for (let i = 0; i < keepShow; i++) html += `<div class="dot dot-blue"></div>`;
  for (let i = 0; i < removeShow; i++) html += `<div class="dot dot-removed"></div>`;
  if (n1 > 20) html += `<div class="dot-plus dot" style="width:auto;padding:0 3px;font-size:0.55rem;">+${n1-20}</div>`;
  html += '</div>';
  return html;
}

// Visual de división: n1 puntos REPARTIDOS en n2 grupos iguales.
//
// Antes la división caía en el `else` del template, o sea el mismo dibujo que
// la suma: n1 puntos, un signo, n2 puntos. Eso muestra dos cantidades sueltas,
// que es justo lo que el dibujo de la multiplicación evita a propósito. En
// «12 ÷ 3» los tres no son tres cosas: son en cuántas partes se reparte.
//
// Se dibujan los grupos, así el chico cuenta cuántos le tocan a cada uno y esa
// cuenta es la respuesta. Sirve igual para las dos formas en que el juego
// enuncia la división —repartir entre n2, o armar grupos de n2— porque el
// número que sale es el mismo.
function buildSharingDotGrid(n1, n2) {
  const total = Math.max(0, Math.floor(n1) || 0);
  const grupos = Math.max(0, Math.floor(n2) || 0);
  if (grupos === 0) return buildDotGrid(total, 'dot-blue');

  // Se recorta la CANTIDAD de grupos, nunca lo que hay dentro de uno. El chico
  // tiene que poder contar un grupo entero: ese número es la respuesta. Cortar
  // los puntos de cada grupo dejaba seis montones con un «+1» colgando, que es
  // justo lo que no se puede contar. El cociente nunca pasa de 12.
  const porGrupo = Math.floor(total / grupos);
  const gruposShow = Math.min(grupos, 6);
  const porGrupoShow = Math.min(porGrupo, 12);

  let html = '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:240px;">';
  for (let g = 0; g < gruposShow; g++) {
    html += '<div class="sharing-group" style="display:flex;flex-wrap:wrap;gap:3px;padding:3px 4px;border:1px dashed rgba(255,255,255,0.25);border-radius:7px;max-width:60px;justify-content:center;">';
    for (let d = 0; d < porGrupoShow; d++) html += `<div class="dot dot-blue"></div>`;
    if (porGrupo > porGrupoShow) {
      html += `<span class="dot-plus dot" style="width:auto;padding:0 3px;font-size:0.5rem;">+${porGrupo - porGrupoShow}</span>`;
    }
    html += '</div>';
  }
  if (grupos > gruposShow) {
    html += `<div style="align-self:center;font-size:0.55rem;color:var(--text-muted);font-weight:800;">+${grupos - gruposShow} grupos más</div>`;
  }
  html += '</div>';
  return html;
}

function renderAnswerBtns() {
  const ch = state.currentChallenge;
  const grid = document.getElementById('answersGrid');
  grid.innerHTML = '';
  ch.answers.forEach((ans, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.id = `abtn-${i}`;
    btn.onclick = () => selectAnswer(ans, i);

    const show = Math.min(ans, 15);
    let dotsHtml = '<div class="answer-dots">';
    for (let j = 0; j < show; j++) dotsHtml += '<div class="answer-dot"></div>';
    if (ans > 15) dotsHtml += `<span class="answer-dot-extra">+${ans-15}</span>`;
    dotsHtml += '</div>';

    btn.innerHTML = `${dotsHtml}<div class="answer-number">${ans}</div>`;
    grid.appendChild(btn);
  });
}

function selectAnswer(ans, idx) {
  const ch = state.currentChallenge;
  if (ch.answered) return;

  const isCorrect = ans === ch.correct;
  const selectedBtn = document.getElementById(`abtn-${idx}`);
  const correctIdx = ch.answers.indexOf(ch.correct);
  const correctBtn = document.getElementById(`abtn-${correctIdx}`);
  // Una opción ya descartada no cuenta como otro error (doble toque).
  ch.descartadas = ch.descartadas || [];
  if (!isCorrect && ch.descartadas.includes(idx)) return;
  state.totalCount++;

  if (isCorrect) {
    ch.answered = true;
    ch.selectedAnswer = ans;
    selectedBtn.classList.add('correct');
    state.streak++;
    state.correctCount++;
    setFeedback('¡Correcto! 🎉', 'ok', 1800);
    updatePenaltyHearts();
    // Streak achievement
    if (state.mode === 'ai' && state.streak >= 5) unlockAchievement('speedMath');
    // Progresión adaptativa: cada 3 correctas seguidas, sube un poco la dificultad
    if (state.streak > 0 && state.streak % 3 === 0) {
      state.difficultyBoost = Math.min(3, (state.difficultyBoost || 0) + 1);
    }
    getHaikuComment('correct', ch.n1, ch.op, ch.n2, ch.correct, state.streak);
  } else {
    state.wrongStreak++;
    state.streak = 0;
    state.difficultyBoost = Math.max(0, (state.difficultyBoost || 0) - 1);
    state.opMisses[ch.op] = (state.opMisses[ch.op] || 0) + 1;
    selectedBtn.classList.add('incorrect');
    // La opción equivocada queda descartada. La correcta NO se muestra
    // mientras quedan intentos: antes se iluminaba tras cada error, y el
    // segundo intento pasaba a ser mirar, no pensar (10 m sin hacer la cuenta).
    ch.descartadas.push(idx);
    selectedBtn.disabled = true;

    if (state.wrongStreak >= 3) {
      // Bloqueado — no puede seguir intentando. Recién acá se muestra la correcta.
      ch.answered = true;
      ch.selectedAnswer = '__blocked__';
      document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
      if (correctBtn) correctBtn.classList.add('correct');
      const correctDots = buildDotGrid(ch.correct, 'dot-blue');
      setFeedback(`❌ 3 errores — ¡sin avance este turno! La correcta era ${ch.correct}<div style="margin-top:4px;">${correctDots}</div>`, 'err', 3000);
      updatePenaltyHearts();
      getHaikuComment('blocked', ch.n1, ch.op, ch.n2, ch.correct, 0);
    } else {
      const remaining = 3 - state.wrongStreak;
      const penaltyMsg = state.wrongStreak === 1
        ? '❌ Incorrecto — avanzarás la mitad si aciertas ahora'
        : `❌ 2 errores — avanzarás muy poco. Te queda ${remaining} intento`;
      setFeedback(penaltyMsg, 'err', 1100);
      updatePenaltyHearts();
      getHaikuComment('incorrect', ch.n1, ch.op, ch.n2, ch.correct, 0);

      // Pasado el sacudón, la descartada queda apagada (no vuelve a habilitarse)
      setTimeout(() => {
        selectedBtn.classList.remove('incorrect');
        selectedBtn.classList.add('discarded');
        updatePenaltyHearts();
      }, 1200);
    }
  }
}

function updatePenaltyHearts() {
  const el = document.getElementById('penaltyHearts');
  if (!el) return;
  const hearts = ['❤️','❤️','❤️'];
  for (let i = 0; i < 3; i++) {
    if (i < state.wrongStreak) hearts[i] = '🖤';
  }
  el.textContent = hearts.join('');
  el.title = `Intentos fallidos: ${state.wrongStreak}/3`;
}

let _feedbackTimer = null;
function setFeedback(msg, type, autoClear = 0) {
  const el = document.getElementById('floatingFeedback');
  if (!el) return;
  // Position it just above the challenge zone
  const zone = document.getElementById('challengeZone');
  if (zone) {
    const rect = zone.getBoundingClientRect();
    el.style.top = (rect.top - 10) + 'px';
  } else {
    el.style.top = '30%';
  }
  el.innerHTML = `<div class="feedback-msg feedback-${type}">${msg}</div>`;
  clearTimeout(_feedbackTimer);
  if (autoClear > 0) _feedbackTimer = setTimeout(() => clearFeedback(), autoClear);
}
function clearFeedback() {
  const el = document.getElementById('floatingFeedback');
  if (el) el.innerHTML = '';
}
