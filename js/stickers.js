// ─── STICKER PICKER ───────────────────────────────
let _pickerMode = 'ai'; // 'ai' | 'human'

function showStickerPick(mode) {
  _pickerMode = mode;
  const title = document.getElementById('stickerPickTitle');
  const body  = document.getElementById('stickerPickBody');
  const unlocked = getUnlockedStickerIds();

  if (mode === 'ai') {
    title.textContent = '🎮 Elige tu corredor';
    const currentSel = state.selectedStickerId;
    body.innerHTML = `
      <div class="spick-section">
        <div class="spick-label">Corredores disponibles</div>
        <div class="spick-grid" id="aiStickerGrid"></div>
      </div>
      <div class="spick-confirm" id="spickConfirm">
        <div class="spick-preview" id="spickPreviewEmoji">🚀</div>
        <div class="spick-preview-info">
          <div class="spick-preview-name" id="spickPreviewName">Cohete</div>
          <div class="spick-preview-sub">Tu corredor en la carrera</div>
        </div>
        <button class="start-race-btn" style="margin-top:0;flex-shrink:0;width:auto;padding:12px 20px;" onclick="startVsAI()">¡Correr! 🏁</button>
      </div>
    `;
    const grid = document.getElementById('aiStickerGrid');
    STICKERS.forEach(s => {
      const isUnlocked = unlocked.includes(s.id);
      const isSelected = s.id === currentSel;
      const btn = document.createElement('button');
      btn.className = `spick-btn ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`;
      btn.disabled = !isUnlocked;
      btn.innerHTML = `
        <span class="spick-emoji">${s.emoji}</span>
        <span class="spick-name">${s.name}</span>
        ${!isUnlocked ? `<span class="spick-lock-hint">${s.hint}</span>` : ''}
      `;
      if (isUnlocked) btn.onclick = () => selectAISticker(s.id);
      grid.appendChild(btn);
    });
    updateAIStickerPreview(currentSel);
  } else {
    // human mode — up to 4 players, each picks a sticker
    title.textContent = '👥 Jugadores y Corredores';
    state.humanPlayers = [
      { name: '', stickerId: 'rocket' },
      { name: '', stickerId: 'star'   },
    ];
    renderHumanSetup();
  }
  showScreen('stickerPickScreen');
}

function selectAISticker(id) {
  state.selectedStickerId = id;
  safeSetItem(pKey('selectedSticker'), id);
  document.querySelectorAll('#aiStickerGrid .spick-btn').forEach(b => b.classList.remove('selected'));
  const idx = STICKERS.findIndex(s => s.id === id);
  if (document.querySelectorAll('#aiStickerGrid .spick-btn')[idx])
    document.querySelectorAll('#aiStickerGrid .spick-btn')[idx].classList.add('selected');
  updateAIStickerPreview(id);
  playClick();
}

function updateAIStickerPreview(id) {
  const s = getStickerById(id);
  const pe = document.getElementById('spickPreviewEmoji');
  const pn = document.getElementById('spickPreviewName');
  if (pe) pe.textContent = s.emoji;
  if (pn) pn.textContent = s.name;
}

// ─── HUMAN SETUP ──────────────────────────────────
function renderHumanSetup() {
  const body = document.getElementById('stickerPickBody');
  const unlocked = getUnlockedStickerIds();

  let html = '<div id="humanPlayerList">';
  state.humanPlayers.forEach((p, i) => {
    const s = getStickerById(p.stickerId);
    const isOpt = i >= 2;
    html += `
      <div class="hplayer-card" id="hcard-${i}">
        <div class="hplayer-top">
          <span class="hplayer-sticker" onclick="toggleMiniPicker(${i})">${s.emoji}</span>
          <input type="text" class="hplayer-input" id="hname-${i}"
            placeholder="${isOpt ? `Jugador ${i+1} (opcional)` : `Jugador ${i+1}`}"
            value="${escapeHtml(p.name)}" maxlength="14"
            oninput="state.humanPlayers[${i}].name=this.value">
          ${isOpt ? `<span class="hplayer-optional-tag">opcional</span>` : ''}
        </div>
        <div class="hplayer-mini-grid" id="hmini-${i}">
          ${STICKERS.map(st => {
            const uk = unlocked.includes(st.id);
            const sel = st.id === p.stickerId;
            return `<button class="hplayer-mini-btn ${sel?'sel-mini':''} ${!uk?'locked-mini':''}"
              ${!uk ? 'disabled' : `onclick="pickHumanSticker(${i},'${st.id}')"`}
              title="${st.name}${!uk?' ('+st.hint+')':''}">${st.emoji}</button>`;
          }).join('')}
        </div>
      </div>
    `;
  });
  html += '</div>';

  const canAdd = state.humanPlayers.length < 4;
  if (canAdd) html += `<button class="add-player-btn" onclick="addHumanPlayer()">＋ Agregar jugador</button>`;

  html += `<button class="start-race-btn" onclick="startHumanRace()" style="margin-top:4px;">🚀 ¡Comenzar Carrera!</button>`;
  body.innerHTML = html;
}

function toggleMiniPicker(i) {
  const grid = document.getElementById(`hmini-${i}`);
  grid.classList.toggle('open');
  playClick();
}

function pickHumanSticker(playerIdx, stickerId) {
  state.humanPlayers[playerIdx].stickerId = stickerId;
  renderHumanSetup();
  // Re-open the picker for that player
  setTimeout(() => {
    const g = document.getElementById(`hmini-${playerIdx}`);
    if (g) g.classList.add('open');
  }, 30);
  playClick();
}

function addHumanPlayer() {
  if (state.humanPlayers.length >= 4) return;
  const fallback = ['lightning','fire','dragon','lion','unicorn','robot'];
  const used = state.humanPlayers.map(p => p.stickerId);
  const next = fallback.find(id => !used.includes(id)) || 'star';
  state.humanPlayers.push({ name: '', stickerId: next });
  renderHumanSetup();
  playClick();
}

// ─── LAUNCH FUNCTIONS ─────────────────────────────
function startVsAI() {
  state.mode = 'ai';
  state.level = readSavedLevel();
  const p = getStickerById(state.selectedStickerId);
  state.dragons = [
    { name: 'Tú', emoji: p.emoji, color: p.color },
    ...AI_RIVALS.slice(0, 3),
  ];
  launchGame();
}

function startHumanRace() {
  // Read names from inputs
  state.humanPlayers.forEach((p, i) => {
    const el = document.getElementById(`hname-${i}`);
    if (el) p.name = el.value.trim();
  });
  // Require at least 2 named
  if (state.humanPlayers.filter(p => p.name).length < 2) {
    toast('Ingresa al menos 2 nombres', 'err'); return;
  }
  state.mode = 'human';
  state.currentTurn = 0;
  state.dragons = state.humanPlayers
    .filter(p => p.name)
    .map(p => {
      const s = getStickerById(p.stickerId);
      return { name: p.name, emoji: s.emoji, color: s.color };
    });
  launchGame();
}

// ─── MODO PRÁCTICA ────────────────────────────────
function startPractice() {
  state.mode = 'practice';
  const p = getStickerById(state.selectedStickerId);
  state.dragons = [{ name: 'Tú', emoji: p.emoji, color: p.color }];
  launchGame();
}

// ─── DESAFÍO DIARIO ───────────────────────────────
function startDailyChallenge() {
  if (localStorage.getItem(pKey('dailyDate')) === todayKey()) {
    const acc = localStorage.getItem(pKey('dailyAccuracy'));
    toast(`Ya jugaste el desafío de hoy — Precisión: ${acc}%. ¡Volvé mañana!`, 'ok');
    return;
  }
  state.mode = 'daily';
  state.dailyRng = mulberry32(todaySeed());
  state.dailyIndex = 0;
  const p = getStickerById(state.selectedStickerId);
  state.dragons = [{ name: 'Tú', emoji: p.emoji, color: p.color }];
  launchGame();
}
