// ═══════════════════════════════════════
//  PARTICLES (HOME)
// ═══════════════════════════════════════
function createParticles() {
  const container = document.getElementById('particleContainer');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#ff6b35','#ffd60a','#f72585','#4cc9f0','#7c3aed','#06d6a0'];
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 3;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 8 + 6}s;
      animation-delay: ${Math.random() * 8}s;
    `;
    container.appendChild(p);
  }
}

// ═══════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════
function showScreen(id) {
  const target = document.getElementById(id);
  if (!target) { console.warn(`showScreen: no existe la pantalla "${id}"`); return; }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  target.classList.add('active');

  // En la carrera los íconos de música/accesibilidad viven en el header del
  // juego (junto a "Salir"); los flotantes globales se ocultan ahí para que
  // no se superpongan.
  const globalMusicBtn = document.getElementById('musicToggle');
  const globalA11yBtn = document.getElementById('a11yToggle');
  const inGame = id === 'gameScreen';
  if (globalMusicBtn) globalMusicBtn.style.display = inGame ? 'none' : 'flex';
  if (globalA11yBtn) globalA11yBtn.style.display = inGame ? 'none' : 'flex';
}

function showInfo() { showScreen('infoScreen'); }

function showAchievements() {
  renderAchievements();
  showScreen('achievementsScreen');
}

function showContinue() {
  const saved = readSavedLevel();
  const cont = document.getElementById('continueContent');
  if (!cont) return;
  if (saved > 1) {
    cont.innerHTML = `
      <div style="background:rgba(255,255,255,0.05);padding:16px;border-radius:14px;margin-bottom:12px;">
        <div style="font-weight:800;margin-bottom:8px;">🐉 Modo IA — Nivel ${saved}/10</div>
        <button class="start-race-btn" onclick="resumeSavedGame()">▶ Continuar desde Nivel ${saved}</button>
      </div>
    `;
  } else {
    cont.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:30px;">No hay partidas guardadas</p>';
  }
  showScreen('continueScreen');
}

function resumeSavedGame() {
  state.mode = 'ai';
  state.level = readSavedLevel();
  const p = getStickerById(state.selectedStickerId);
  state.dragons = [
    { name: 'Tú', emoji: p.emoji, color: p.color },
    ...AI_RIVALS.slice(0, 3),
  ];
  launchGame();
}

// ═══════════════════════════════════════
//  PASAR DISPOSITIVO (vs Amigos)
// ═══════════════════════════════════════
// Entre turnos, confirma que el dispositivo ya pasó a manos del próximo
// jugador antes de mostrar la pregunta — evita que alguien responda en el
// turno de otro por estar mirando la pantalla compartida.
function showPassDeviceScreen() {
  const modal = document.getElementById('passDeviceModal');
  const d = state.dragons[state.currentTurn];
  if (!modal || !d) { loadChallenge(); return; }
  const emojiEl = document.getElementById('passDeviceEmoji');
  const nameEl = document.getElementById('passDeviceName');
  if (emojiEl) emojiEl.textContent = d.emoji;
  if (nameEl) nameEl.textContent = d.name; // textContent -> seguro aunque el nombre tenga caracteres raros
  modal.classList.add('active');
}
function confirmPassDevice() {
  const modal = document.getElementById('passDeviceModal');
  if (modal) modal.classList.remove('active');
  loadChallenge();
}

// ═══════════════════════════════════════
//  ACCESIBILIDAD
// ═══════════════════════════════════════
function showA11yPanel() {
  const contrastEl = document.getElementById('a11yContrast');
  const motionEl = document.getElementById('a11yMotion');
  const fontEl = document.getElementById('a11yFontSize');
  const musicVolEl = document.getElementById('musicVolumeRange');
  const sfxVolEl = document.getElementById('sfxVolumeRange');
  const modal = document.getElementById('a11yModal');
  if (contrastEl) contrastEl.checked = document.body.classList.contains('a11y-contrast');
  if (motionEl) motionEl.checked = document.body.classList.contains('a11y-reduce-motion');
  if (fontEl) fontEl.value = localStorage.getItem('a11yFontSize') || '0';
  if (musicVolEl) musicVolEl.value = getMusicVolumePct();
  if (sfxVolEl) sfxVolEl.value = getSfxVolumePct();
  if (modal) modal.classList.add('active');
}
function hideA11yPanel() {
  const modal = document.getElementById('a11yModal');
  if (modal) modal.classList.remove('active');
}
function toggleA11y(key, enabled) {
  const cls = key === 'contrast' ? 'a11y-contrast' : 'a11y-reduce-motion';
  document.body.classList.toggle(cls, enabled);
  safeSetItem(`a11y_${key}`, enabled ? '1' : '0');
}
function setA11yFontSize(step) {
  document.body.classList.remove('a11y-font-1', 'a11y-font-2');
  if (step === '1') document.body.classList.add('a11y-font-1');
  if (step === '2') document.body.classList.add('a11y-font-2');
  safeSetItem('a11yFontSize', step);
}
function applyStoredA11ySettings() {
  if (localStorage.getItem('a11y_contrast') === '1') document.body.classList.add('a11y-contrast');
  if (localStorage.getItem('a11y_reduceMotion') === '1') document.body.classList.add('a11y-reduce-motion');
  setA11yFontSize(localStorage.getItem('a11yFontSize') || '0');
}
