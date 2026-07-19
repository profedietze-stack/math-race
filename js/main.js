// ═══════════════════════════════════════
//  INIT
// ═══════════════════════════════════════
window.addEventListener('load', () => {
  // Cada paso de init va aislado: si uno falla (audio, storage corrupto, etc.)
  // no debe tumbar el resto de la pantalla de inicio.
  try { createParticles(); } catch (e) { console.warn('createParticles falló', e); }
  try { state.achievements = safeGetJSON(pKey('achievements'), {}); } catch (e) { console.warn('achievements falló', e); }
  try { applyStoredA11ySettings(); } catch (e) { console.warn('a11y settings falló', e); }
  try { updateProfileBadge(); } catch (e) { console.warn('profile badge falló', e); }

  // Start menu music on first user interaction (autoplay policy)
  const startAudioOnce = async () => {
    try {
      if (!musicMuted && currentMusic !== 'menu') {
        await startMenuMusic();
      }
    } catch (e) {
      console.warn('No se pudo iniciar la música', e);
    }
    document.removeEventListener('pointerdown', startAudioOnce);
    document.removeEventListener('keydown', startAudioOnce);
  };
  document.addEventListener('pointerdown', startAudioOnce);
  document.addEventListener('keydown', startAudioOnce);

  // Init real terminado: se lo avisa a la barra del splash (que tiene su
  // propio piso mínimo de tiempo, ver index.html) y recién cuando ESA barra
  // llega a 100% se muestra el selector de perfil (o "Continuar" si no hay
  // ninguno) — hideSplash() lo dispara chooseProfile()/chooseGuestMode().
  const revealSplashPicker = () => {
    try {
      if (typeof showSplashPicker === 'function') showSplashPicker();
      else if (typeof hideSplash === 'function') hideSplash();
    } catch (e) { console.warn('splash picker falló', e); try { hideSplash(); } catch (e2) {} }
  };
  try {
    if (typeof window.__splashMarkReal === 'function') window.__splashMarkReal(revealSplashPicker);
    else revealSplashPicker();
  } catch (e) { console.warn('splash markReal falló', e); revealSplashPicker(); }
});
