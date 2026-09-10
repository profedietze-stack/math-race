// ═══════════════════════════════════════
//  GAME INIT
// ═══════════════════════════════════════
function launchGame() {
  state.positions = state.dragons.map(() => 0);
  state.gameActive = true;
  state.streak = 0;
  state.correctCount = 0;
  state.totalCount = 0;
  state.wrongStreak = 0; // errores acumulados en la pregunta actual
  state.fireballCount = 0;
  state.difficultyBoost = 0;
  state.opMisses = {};
  state._wasLast = false;
  state._statsGuardadas = false;
  renderTrack();
  updateLevelBadge();
  showScreen('gameScreen');
  // vs Amigos: confirmar que se pasó el dispositivo antes de mostrar la 1ª pregunta
  if (state.mode === 'human') showPassDeviceScreen();
  else loadChallenge();
}

function updateLevelBadge() {
  const badge = document.getElementById('levelBadge');
  if (state.mode === 'ai') {
    badge.textContent = `Nivel ${state.level} / 10 — ${LEVELS[state.level-1].name}`;
  } else if (state.mode === 'practice') {
    badge.textContent = '🎯 Modo Práctica';
  } else if (state.mode === 'daily') {
    badge.textContent = `📅 Desafío Diario — ${state.dailyIndex + 1}/${DAILY_QUESTIONS}`;
  } else {
    badge.textContent = '👥 Carrera vs Amigos';
  }
}

// ═══════════════════════════════════════
//  RACE TRACK
// ═══════════════════════════════════════
function renderTrack() {
  const track = document.getElementById('raceTrack');
  track.innerHTML = '';
  state.dragons.forEach((d, i) => {
    const lane = document.createElement('div');
    lane.className = 'lane';

    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    fill.style.background = d.color;
    fill.id = `fill-${i}`;
    fill.style.width = '0%';

    const lineEl = document.createElement('div');
    lineEl.className = 'lane-track';

    const finish = document.createElement('div');
    finish.className = 'lane-finish';
    finish.textContent = '🏁';

    const runner = document.createElement('div');
    runner.className = 'dragon-runner';
    runner.id = `runner-${i}`;
    runner.style.left = '0%';
    runner.innerHTML = `<span class="dragon-emoji">${d.emoji}</span><span class="dragon-label">${escapeHtml(d.name)}</span>`;

    lane.append(fill, lineEl, finish, runner);
    track.appendChild(lane);
  });
}

function updatePositions() {
  state.dragons.forEach((_, i) => {
    const pct = Math.min((state.positions[i] / RACE_DISTANCE) * 85, 85);
    document.getElementById(`runner-${i}`).style.left = pct + '%';
    document.getElementById(`fill-${i}`).style.width = (pct / 85 * 100) + '%';
  });
  // Track comeback: player (idx 0) was last at some point
  if (state.mode === 'ai' && state.positions.length > 1) {
    const playerPos = state.positions[0];
    const minPos = Math.min(...state.positions);
    if (playerPos === minPos && state.positions.filter(p => p === minPos).length === 1) {
      state._wasLast = true;
    }
  }
}

// ═══════════════════════════════════════
//  EXPLOSION EFFECT
// ═══════════════════════════════════════
function triggerExplosion(runnerEl) {
  // Clean up any previous explosion
  runnerEl.querySelectorAll('.explosion-wrapper').forEach(e => e.remove());

  const wrapper = document.createElement('div');
  wrapper.className = 'explosion-wrapper';

  // Flash
  const flash = document.createElement('div');
  flash.className = 'exp-flash';
  wrapper.appendChild(flash);

  // Ring
  const ring = document.createElement('div');
  ring.className = 'exp-ring';
  wrapper.appendChild(ring);

  // Flying emoji
  const emoji = document.createElement('div');
  emoji.className = 'exp-emoji';
  emoji.textContent = '💥';
  wrapper.appendChild(emoji);

  // Particles
  const colors = ['#ff6b35','#ffd60a','#f72585','#ff0000','#ff8800','#ffdd00'];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'exp-particle';
    const angle = (360 / count) * i + (Math.random() * 20 - 10);
    const dist = 22 + Math.random() * 18;
    const rad = angle * Math.PI / 180;
    const tx = Math.cos(rad) * dist;
    const ty = Math.sin(rad) * dist;
    const size = 4 + Math.random() * 5;
    const dur = 0.4 + Math.random() * 0.25;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      background:${colors[i % colors.length]};
      --tx:${tx.toFixed(1)}px; --ty:${ty.toFixed(1)}px;
      --dur:${dur.toFixed(2)}s;
      animation-delay:${(Math.random()*0.05).toFixed(2)}s;
    `;
    wrapper.appendChild(p);
  }

  runnerEl.appendChild(wrapper);

  // Shake the runner
  runnerEl.classList.remove('runner-hit');
  void runnerEl.offsetWidth; // reflow
  runnerEl.classList.add('runner-hit');

  // Clean up after animation
  setTimeout(() => {
    wrapper.remove();
    runnerEl.classList.remove('runner-hit');
  }, 900);
}
