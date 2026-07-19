// ═══════════════════════════════════════
//  PERFILES — multi-usuario local, sin contraseña
//  Cada perfil namespacea su progreso vía pKey() (ver utils.js).
//  Sin perfil elegido, el juego sigue funcionando como "invitado" usando
//  las claves de localStorage sin prefijo (compatible con partidas viejas).
// ═══════════════════════════════════════

const MAX_PROFILES = 6;
const PROFILE_KEYS = [
  'savedLevel', 'achievements', 'maxAILevel', 'selectedSticker',
  'consecutiveWins', 'statsHistory', 'dailyDate', 'dailyAccuracy',
  'dailyCorrect', 'dailyTotal', 'dailyStatsLog',
];

function getProfiles() {
  const list = safeGetJSON('profiles', []);
  return Array.isArray(list) ? list : [];
}
function saveProfiles(list) { safeSetItem('profiles', JSON.stringify(list)); }

function createProfile(name) {
  const clean = String(name || '').trim().slice(0, 16);
  if (!clean) return null;
  const list = getProfiles();
  if (list.length >= MAX_PROFILES) return null;
  const profile = { id: `${Date.now()}_${Math.floor(Math.random() * 10000)}`, name: clean, createdAt: Date.now() };
  list.push(profile);
  saveProfiles(list);
  return profile;
}

function deleteProfile(id) {
  const list = getProfiles().filter(p => p.id !== id);
  saveProfiles(list);
  // Limpieza de todo el progreso guardado bajo ese perfil
  PROFILE_KEYS.forEach(k => { try { localStorage.removeItem(`p_${id}_${k}`); } catch (e) {} });
  if (currentProfileId === id) {
    currentProfileId = null;
    safeSetItem('activeProfileId', '');
  }
}

function getActiveProfile() {
  if (!currentProfileId) return null;
  return getProfiles().find(p => p.id === currentProfileId) || null;
}

// Activa un perfil y recarga en `state` los datos que ya se leyeron al
// construir el objeto (el resto de las funciones leen con pKey() al vuelo).
function setActiveProfile(id) {
  currentProfileId = id;
  safeSetItem('activeProfileId', id || '');
  state.level = readSavedLevel();
  state.achievements = safeGetJSON(pKey('achievements'), {});
  state.selectedStickerId = localStorage.getItem(pKey('selectedSticker')) || 'rocket';
}

// ── UI ──
function renderProfileScreen() {
  const body = document.getElementById('profileScreenBody');
  if (!body) return;
  const profiles = getProfiles();

  let html = `<div class="spick-label">¿Quién juega?</div>`;
  html += `<div class="profile-grid">`;
  profiles.forEach(p => {
    const isActive = p.id === currentProfileId;
    html += `
      <div class="profile-card">
        <button class="profile-select-btn ${isActive ? 'selected' : ''}" onclick="chooseProfile('${p.id}')">
          <span class="profile-avatar">🧒</span>
          <span class="profile-name">${escapeHtml(p.name)}</span>
        </button>
        <button class="profile-delete-btn" onclick="confirmDeleteProfile('${p.id}')" title="Eliminar perfil">🗑</button>
      </div>
    `;
  });
  html += `</div>`;

  if (profiles.length < MAX_PROFILES) {
    html += `
      <div class="profile-new-row">
        <input type="text" id="newProfileName" class="hplayer-input" placeholder="Nombre nuevo jugador" maxlength="16">
        <button class="start-race-btn" style="margin-top:0;width:auto;padding:12px 18px;" onclick="handleCreateProfile()">＋ Crear</button>
      </div>
    `;
  } else {
    html += `<p style="color:var(--text-muted);font-size:0.8rem;text-align:center;margin-top:10px;">Máximo ${MAX_PROFILES} jugadores. Borrá alguno para agregar otro.</p>`;
  }

  if (profiles.length > 0) {
    html += `<button class="add-player-btn" style="margin-top:14px;" onclick="chooseGuestMode()">Jugar como invitado (sin perfil)</button>`;
  }

  body.innerHTML = html;
}

function chooseProfile(id) {
  setActiveProfile(id);
  playClick();
  updateProfileBadge();
  showScreen('homeScreen');
  if (typeof hideSplash === 'function') hideSplash();
}

function chooseGuestMode() {
  setActiveProfile(null);
  playClick();
  updateProfileBadge();
  showScreen('homeScreen');
  if (typeof hideSplash === 'function') hideSplash();
}

// ── Selector de perfil embebido en el splash de carga ──
// Reusa chooseProfile()/chooseGuestMode() (arriba) para no duplicar lógica.
function renderSplashPicker() {
  const picker = document.getElementById('splashPicker');
  if (!picker) return;
  const profiles = getProfiles();

  if (profiles.length === 0) {
    picker.innerHTML = `<button class="start-race-btn splash-continue-btn" onclick="chooseGuestMode()">▶ Continuar</button>`;
    return;
  }

  let html = `<div class="splash-picker-label">¿Quién juega?</div><div class="profile-grid">`;
  profiles.forEach(p => {
    html += `
      <button class="profile-select-btn" onclick="chooseProfile('${p.id}')">
        <span class="profile-avatar">🧒</span>
        <span class="profile-name">${escapeHtml(p.name)}</span>
      </button>
    `;
  });
  html += `</div><button class="add-player-btn" onclick="chooseGuestMode()">Jugar como invitado</button>`;
  picker.innerHTML = html;
}

// Llamado al terminar la carga real (main.js): en vez de ocultar el splash
// directo, muestra el selector de perfil y espera que el jugador elija.
function showSplashPicker() {
  const picker = document.getElementById('splashPicker');
  if (!picker) { if (typeof hideSplash === 'function') hideSplash(); return; }
  const loading = document.getElementById('splashLoading');
  if (loading) loading.style.display = 'none';
  renderSplashPicker();
  picker.classList.add('active');
}

function handleCreateProfile() {
  const input = document.getElementById('newProfileName');
  if (!input) return;
  const profile = createProfile(input.value);
  if (!profile) { toast('Escribí un nombre (o ya hay 6 jugadores)', 'err'); return; }
  chooseProfile(profile.id);
}

function confirmDeleteProfile(id) {
  const p = getProfiles().find(x => x.id === id);
  if (!p) return;
  if (!confirm(`¿Borrar a ${p.name}? Se pierde todo su progreso.`)) return;
  deleteProfile(id);
  if (!currentProfileId) updateProfileBadge();
  renderProfileScreen();
}

function showProfileScreen() {
  renderProfileScreen();
  showScreen('profileScreen');
}

function updateProfileBadge() {
  const el = document.getElementById('activeProfileName');
  if (!el) return;
  const p = getActiveProfile();
  el.textContent = p ? p.name : 'Elegir jugador';
}

// ── Exports condicionales para tests en Node (no afecta al navegador) ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getProfiles, saveProfiles, createProfile, deleteProfile,
    setActiveProfile, getActiveProfile, MAX_PROFILES, PROFILE_KEYS,
  };
}
