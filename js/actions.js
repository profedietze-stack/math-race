// ═══════════════════════════════════════
//  IA ADAPTATIVA (catch-up / mercy rubber-band)
// ═══════════════════════════════════════
function aiAdvanceAmount() {
  const aiPositions = state.positions.slice(1);
  const avgAI = aiPositions.reduce((a, b) => a + b, 0) / aiPositions.length;
  const gap = state.positions[0] - avgAI; // positivo = jugador adelante
  let base = rand(4, 18);
  if (gap > 15) base += Math.min(gap * 0.2, 10);       // catch-up: IA acelera un poco
  else if (gap < -15) base -= Math.min(-gap * 0.15, 6); // mercy: IA afloja un poco
  return Math.max(2, base);
}

// ═══════════════════════════════════════
//  MOVE / FIREBALL
// ═══════════════════════════════════════
function doMove() {
  const ch = state.currentChallenge;
  if (!ch.answered) { toast('Primero elige una respuesta', 'err'); return; }

  const whoIdx = state.mode === 'human' ? state.currentTurn : 0;

  // Penalty scale: 0 errors = 20, 1 error = 10, 2 errors = 5, 3 errors = 0
  const advanceTable = [20, 10, 5, 0];
  // Con tres errores `selectedAnswer` queda en '__blocked__', que no es la
  // correcta: cae solo en el avance 0. No hace falta mirarlo aparte.
  const isCorrect = ch.selectedAnswer === ch.correct;
  const advance = isCorrect ? advanceTable[Math.min(state.wrongStreak, 3)] : 0;

  state.positions[whoIdx] += advance;

  if (state.mode === 'ai') {
    for (let i = 1; i < state.dragons.length; i++) {
      state.positions[i] += aiAdvanceAmount();
    }
  }

  updatePositions();

  if (state.mode === 'daily') {
    state.dailyIndex++;
    if (state.dailyIndex >= DAILY_QUESTIONS) { endDailyChallenge(); return; }
    proceedToNextChallenge(800);
    return;
  }

  if (checkWinner()) return;

  if (state.mode === 'human') {
    state.currentTurn = (state.currentTurn + 1) % state.dragons.length;
  }

  proceedToNextChallenge(800);
}

function doFireball() {
  const ch = state.currentChallenge;
  if (!ch.answered) { toast('Primero elige una respuesta', 'err'); return; }
  if (ch.selectedAnswer !== ch.correct) { toast('Necesitas responder correctamente para atacar 🔥', 'err'); return; }

  const whoIdx = state.mode === 'human' ? state.currentTurn : 0;

  // Pick random target from opponents (both modes)
  const others = [...Array(state.dragons.length).keys()].filter(i => i !== whoIdx);
  if (others.length === 0) { toast('No hay rivales para atacar', 'err'); return; }
  const targetIdx = pick(others);

  // Trigger explosion on target runner
  const runnerEl = document.getElementById(`runner-${targetIdx}`);
  if (runnerEl) triggerExplosion(runnerEl);

  // Track fireball achievement (mode IA only)
  if (state.mode === 'ai') {
    state.fireballCount++;
    if (state.fireballCount >= 5) unlockAchievement('fireballer');
  }

  // Delay position update so explosion lands first
  setTimeout(() => {
    state.positions[targetIdx] = Math.max(0, state.positions[targetIdx] - 15);

    if (state.mode === 'ai') {
      for (let i = 1; i < state.dragons.length; i++) {
        if (i !== targetIdx) state.positions[i] += aiAdvanceAmount();
      }
    }

    updatePositions();
    if (checkWinner()) return;

    if (state.mode === 'human') {
      state.currentTurn = (state.currentTurn + 1) % state.dragons.length;
    }

    proceedToNextChallenge(900);
  }, 700);

  setFeedback(`🔥 ¡Bola de fuego! ${state.dragons[targetIdx].emoji} ${escapeHtml(state.dragons[targetIdx].name)} retrocedió`, 'ok', 2000);
  getHaikuComment('fireball', ch.n1, ch.op, ch.n2, ch.correct, 0, state.dragons[targetIdx].name);
}

// ═══════════════════════════════════════
//  WIN CHECK
// ═══════════════════════════════════════
function checkWinner() {
  for (let i = 0; i < state.positions.length; i++) {
    if (state.positions[i] >= RACE_DISTANCE) {
      if (state.mode === 'practice') {
        // Modo práctica: no termina, da la vuelta y sigue sumando racha
        state.positions[i] = 0;
        updatePositions();
        toast(`🎯 ¡Vuelta completa! Racha actual: ${state.streak}`, 'ok');
        return false;
      }
      endRace(i);
      return true;
    }
  }
  return false;
}
