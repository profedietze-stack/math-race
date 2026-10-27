// ═══════════════════════════════════════
//  WIN / RESULTS
// ═══════════════════════════════════════
// Contra la IA el jugador es el índice 0 y se le habla de vos a vos. En vs
// Amigos el dispositivo lo miran todos: se nombra a quien ganó, siempre con
// trofeo (ganó alguien de la ronda, no "perdió el dispositivo").
function tituloDeResultado(mode, winnerIdx, dragons) {
  const nombre = (dragons[winnerIdx] && dragons[winnerIdx].name) || '';
  if (mode === 'human') return { emoji: '🏆', titulo: `¡Ganó ${nombre}!` };
  return winnerIdx === 0
    ? { emoji: '🏆', titulo: '¡Ganaste!' }
    : { emoji: '😅', titulo: `¡Ganó ${nombre}!` };
}

function endRace(winnerIdx) {
  state.gameActive = false;

  const sorted = state.dragons
    .map((d, i) => ({ ...d, pos: state.positions[i], idx: i }))
    .sort((a, b) => b.pos - a.pos);

  const medals = ['🥇','🥈','🥉','4°'];
  let podiumHtml = '';
  sorted.forEach((d, rank) => {
    podiumHtml += `
      <div class="podium-item">
        <span class="podium-rank">${medals[rank]}</span>
        <span class="podium-name">${d.emoji} ${escapeHtml(d.name)}</span>
        <span class="podium-pos">${Math.round(d.pos)}m</span>
      </div>
    `;
  });

  const playerWon = winnerIdx === 0;
  const { emoji, titulo } = tituloDeResultado(state.mode, winnerIdx, state.dragons);
  document.getElementById('resultEmoji').textContent = emoji;
  document.getElementById('resultTitle').textContent = titulo;

  // Reset streak if player lost
  if (state.mode === 'ai' && !playerWon) {
    safeSetItem(pKey('consecutiveWins'), '0');
  }
  document.getElementById('podiumList').innerHTML = podiumHtml;
  document.getElementById('resultAiText').textContent = '...';

  const nextBtn = document.getElementById('nextLevelBtn');
  if (nextBtn) {
    nextBtn.style.display = (state.mode === 'ai' && winnerIdx === 0 && state.level < 10) ? 'block' : 'none';
  }
  // "Repetir" siempre válido para ai/human (no para daily, ese tiene su propio candado diario)
  const restartBtn = document.getElementById('restartBtn');
  if (restartBtn) restartBtn.style.display = 'block';

  // Save level progress
  if (state.mode === 'ai' && winnerIdx === 0) {
    const nextLevelNum = clamp(state.level + 1, 1, 10);
    safeSetItem(pKey('savedLevel'), nextLevelNum);
    const prevMax = clamp(parseInt(localStorage.getItem(pKey('maxAILevel')), 10) || 0, 0, 10);
    if (state.level > prevMax) safeSetItem(pKey('maxAILevel'), state.level);
    unlockAchievement('firstWin');
    if (state.level >= 5) unlockAchievement('halfwayHero');
    if (state.level === 10) unlockAchievement('allLevels');
    if (state.totalCount > 0 && state.correctCount === state.totalCount) unlockAchievement('perfectRace');
    if (state._wasLast) unlockAchievement('comeback');
    // Consecutive wins
    const wins = (parseInt(localStorage.getItem(pKey('consecutiveWins')), 10) || 0) + 1;
    safeSetItem(pKey('consecutiveWins'), wins);
    if (wins >= 3) unlockAchievement('unstoppable');
    // Check newly unlocked stickers
    const newlyUnlocked = STICKERS.filter(s => s.unlockLevel > 0 && s.unlockLevel <= state.level && s.unlockLevel > prevMax);
    if (newlyUnlocked.length > 0) {
      setTimeout(() => {
        toast(`🎉 ¡Nuevo corredor desbloqueado: ${newlyUnlocked.map(s=>s.emoji+' '+s.name).join(', ')}!`, 'ok');
      }, 1800);
    }
  }

  document.getElementById('resultModal').classList.add('active');

  // Guardar estadísticas históricas (qué operación falla más, precisión acumulada)
  if (state.mode === 'ai' || state.mode === 'human') {
    guardarEstadisticasDeCarrera();
  }

  // Haiku end-race comment
  getHaikuEndComment(winnerIdx === 0, sorted[0].name, state.level, state.correctCount, state.totalCount);
}

// ═══════════════════════════════════════
//  DESAFÍO DIARIO — fin
// ═══════════════════════════════════════
// Guarda cómo va el diario de hoy. Se llama al empezar (marca el día: no se
// puede volver a jugar), al terminar y al salir a mitad (queda lo respondido).
function guardarResultadoDiario() {
  const accuracy = state.totalCount > 0 ? Math.round((state.correctCount / state.totalCount) * 100) : 0;
  safeSetItem(pKey('dailyDate'), todayKey());
  safeSetItem(pKey('dailyAccuracy'), accuracy);
  safeSetItem(pKey('dailyCorrect'), state.correctCount);
  safeSetItem(pKey('dailyTotal'), state.totalCount);
  return accuracy;
}

function endDailyChallenge() {
  state.gameActive = false;
  guardarEstadisticasDeCarrera();
  const accuracy = guardarResultadoDiario();

  document.getElementById('resultEmoji').textContent = '📅';
  document.getElementById('resultTitle').textContent = '¡Desafío Completado!';
  document.getElementById('podiumList').innerHTML = `
    <div class="podium-item">
      <span class="podium-rank">🎯</span>
      <span class="podium-name">Precisión de hoy</span>
      <span class="podium-pos">${accuracy}%</span>
    </div>
  `;
  document.getElementById('resultAiText').textContent = `Respondiste ${state.correctCount} de ${state.totalCount} correctas. ¡Volvé mañana por un nuevo desafío!`;
  const nextBtn = document.getElementById('nextLevelBtn');
  if (nextBtn) nextBtn.style.display = 'none';
  // Sin "Repetir": el Desafío Diario es una vez por día, "Repetir" lo rompería
  // (reusaría el RNG ya agotado y saltaría el candado de dailyDate).
  const restartBtn = document.getElementById('restartBtn');
  if (restartBtn) restartBtn.style.display = 'none';
  document.getElementById('resultModal').classList.add('active');
}

function nextLevel() {
  if (state.level < 10) {
    state.level++;
    document.getElementById('resultModal').classList.remove('active');
    launchGame();
  }
}

function restartSameLevel() {
  document.getElementById('resultModal').classList.remove('active');
  // El Desafío Diario no se puede "repetir" (una vez por día); por las dudas
  // que algo dispare este botón igual, mandamos a home en vez de relanzar.
  if (state.mode === 'daily') { showScreen('homeScreen'); return; }
  launchGame();
}

function returnHome() {
  document.getElementById('resultModal').classList.remove('active');
  showScreen('homeScreen');
}

function exitGame() {
  document.getElementById('exitModal').classList.add('active');
}
function exitConfirm() {
  document.getElementById('exitModal').classList.remove('active');
  // La carrera termina acá: los timers que quedaron en el aire (bola de
  // fuego, próxima pregunta) miran esto antes de tocar nada.
  state.gameActive = false;
  // Salir a mitad de carrera no borra lo que el alumno respondió. Vale para
  // todos los modos, no sólo para práctica: el modo práctica no dispara
  // endRace nunca, pero una carrera vs IA abandonada tampoco.
  guardarEstadisticasDeCarrera();
  if (state.mode === 'daily') guardarResultadoDiario();
  showScreen('homeScreen');
}
function exitCancel() {
  document.getElementById('exitModal').classList.remove('active');
}

// ═══════════════════════════════════════
//  COMPARTIR RESULTADO
// ═══════════════════════════════════════
async function shareResult() {
  const accuracy = state.totalCount > 0 ? Math.round((state.correctCount / state.totalCount) * 100) : 0;
  const title = document.getElementById('resultTitle').textContent;
  const text = `🐉 Math Race — ${title}\nPrecisión: ${accuracy}% (${state.correctCount}/${state.totalCount})\n¡Jugá vos también!`;

  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { /* usuario canceló, seguir con fallback */ }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('📋 Resultado copiado al portapapeles', 'ok');
  } catch (e) {
    toast('No se pudo compartir', 'err');
  }
}

// ═══════════════════════════════════════
//  ACHIEVEMENTS
// ═══════════════════════════════════════
function unlockAchievement(id) {
  if (!state.achievements[id]) {
    state.achievements[id] = true;
    safeSetItem(pKey('achievements'), JSON.stringify(state.achievements));
    const a = ACHIEVS.find(x => x.id === id);
    if (a) setTimeout(() => toast(`${a.icon} Logro desbloqueado: ${a.name}`, 'ok'), 2200);
  }
}

const OP_NAMES = { '+': 'sumas', '-': 'restas', '×': 'multiplicaciones', '÷': 'divisiones' };

function renderAchievements() {
  const grid = document.getElementById('achievGrid');
  if (!grid) return;
  const unlocked = getUnlockedStickerIds();
  const stats = getStatsHistory();
  const weakestOp = getWeakestOp();
  const globalAccuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;

  let html = `<div class="rotulo-seccion rotulo-seccion-primero">Tus Estadísticas</div>`;
  html += `<div class="fila-entera info-card">`;
  if (stats.races === 0) {
    html += `<p>Todavía no jugaste ninguna carrera. ¡Arrancá para ver tus estadísticas acá!</p>`;
  } else {
    html += `<p><strong>Carreras jugadas:</strong> ${stats.races}</p>`;
    html += `<p><strong>Precisión general:</strong> ${globalAccuracy}%</p>`;
    html += weakestOp
      ? `<p><strong>A reforzar:</strong> ${OP_NAMES[weakestOp] || weakestOp} 📌</p>`
      : `<p><strong>A reforzar:</strong> ¡sin datos todavía, casi no fallás! 🎉</p>`;
  }
  html += `</div>`;

  // Historial semanal: últimos 7 días de precisión
  const weekly = getWeeklyStats();
  const dayLetters = ['D','L','M','M','J','V','S'];
  html += `<div class="fila-entera info-card">
    <h3>📈 Últimos 7 días</h3>
    <div class="weekly-chart">
      ${weekly.map(d => {
        const [y, m, dd] = d.key.split('-').map(Number);
        const dow = new Date(y, m - 1, dd).getDay();
        const barHeight = d.accuracy === null ? 4 : Math.max(6, d.accuracy);
        const barColor = d.accuracy === null ? 'rgba(255,255,255,0.08)' : (d.accuracy >= 70 ? 'var(--green)' : d.accuracy >= 40 ? 'var(--yellow)' : 'var(--red)');
        return `
          <div class="weekly-bar-col" title="${d.accuracy === null ? 'Sin datos' : d.accuracy + '%'}">
            <div class="weekly-bar" style="height:${barHeight}%;background:${barColor};"></div>
            <div class="weekly-bar-label">${dayLetters[dow]}</div>
          </div>
        `;
      }).join('')}
    </div>
  </div>`;

  html += `<div class="rotulo-seccion">Logros</div>`;
  html += ACHIEVS.map(a => `
    <div class="achiev-card ${state.achievements[a.id] ? 'unlocked' : 'locked'}">
      <div class="achiev-icon">${a.icon}</div>
      <div class="achiev-name">${a.name}</div>
      <div class="achiev-desc">${a.desc}</div>
    </div>
  `).join('');

  html += `<div class="rotulo-seccion">Corredores desbloqueados</div>`;
  html += STICKERS.map(s => {
    const isUnlocked = unlocked.includes(s.id);
    return `
      <div class="achiev-card ${isUnlocked ? 'unlocked' : 'locked'}">
        <div class="achiev-icon">${s.emoji}</div>
        <div class="achiev-name">${s.name}</div>
        <div class="achiev-desc">${s.unlockLevel === 0 ? 'Libre' : (isUnlocked ? `Desbloqueado ✓` : `Superá el nivel ${s.unlockLevel}`)}</div>
        ${!isUnlocked ? `<div class="candado">🔒</div>` : ''}
      </div>
    `;
  }).join('');

  grid.innerHTML = html;
}

// ── Exports condicionales para tests en Node (no afecta al navegador) ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { exitConfirm, exitCancel, unlockAchievement, tituloDeResultado, guardarResultadoDiario };
}
