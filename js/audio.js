// ═══════════════════════════════════════
//  AUDIO ENGINE
// ═══════════════════════════════════════

// ── Web Audio API: UI SFX ──────────────
let audioCtx = null;
let musicMuted = false;
let currentMusic = null; // 'menu' | 'race' | null
let Tone = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, type = 'sine', dur = 0.12, gain = 0.25, delay = 0) {
  if (musicMuted) return;
  const scaledGain = gain * sfxVolumeMult();
  if (scaledGain <= 0.001) return; // volumen de efectos en 0
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, ctx.currentTime + delay);
    env.gain.linearRampToValueAtTime(scaledGain, ctx.currentTime + delay + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + dur + 0.01);
  } catch(e) {}
}

function playClick() {
  playTone(880, 'sine', 0.07, 0.2);
  playTone(1100, 'sine', 0.07, 0.12, 0.06);
}

function playCorrect() {
  [523, 659, 784, 1047].forEach((f, i) => playTone(f, 'sine', 0.12, 0.2, i * 0.07));
}

function playWrong() {
  playTone(220, 'sawtooth', 0.18, 0.18);
  playTone(180, 'sawtooth', 0.18, 0.15, 0.1);
}

function playFireball() {
  const peak = 0.4 * sfxVolumeMult();
  if (!musicMuted && peak > 0.001) {
    // whoosh + impact
    try {
      const ctx = getCtx();
      // noise whoosh
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 800;
      const gn = ctx.createGain();
      gn.gain.setValueAtTime(peak, ctx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      src.connect(filt); filt.connect(gn); gn.connect(ctx.destination);
      src.start(); src.stop(ctx.currentTime + 0.31);
    } catch(e) {}
  }
  playTone(150, 'sawtooth', 0.25, 0.3, 0.15);
}

function playWin() {
  const melody = [523,659,784,659,784,1047];
  melody.forEach((f, i) => playTone(f, 'sine', 0.18, 0.25, i * 0.1));
}

// ── Tone.js: MUSIC ──────────────────────
let _toneLoadFailed = false;
async function loadTone() {
  if (Tone) return;
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'vendor/Tone.js';
    s.onload = () => { Tone = window.Tone; resolve(); };
    s.onerror = () => {
      // Sin internet la primera vez que se necesita música -> avisar una sola
      // vez por sesión en vez de dejar al juego mudo sin explicación.
      if (!_toneLoadFailed) {
        _toneLoadFailed = true;
        if (typeof toast === 'function') toast('🔇 Sin música (necesita internet la primera vez)', 'err');
      }
      resolve(); // graceful fail — el juego sigue jugable sin música
    };
    document.head.appendChild(s);
  });
}

// ── Volumen base de cada voz (antes del offset del slider) ──
const VOL_MENU_LEAD = -20, VOL_MENU_PAD = -28;
const VOL_RACE_LEAD = -22, VOL_RACE_RHYTHM = -30, VOL_RACE_GALLOP = -20;

function setMusicVolume(val) {
  safeSetItem('musicVolume', val);
  const offset = musicVolumeOffsetDb();
  if (window._menuSynth) window._menuSynth.volume.value = VOL_MENU_LEAD + offset;
  if (window._menuBass) window._menuBass.volume.value = VOL_MENU_PAD + offset;
  if (window._raceSynths) {
    const [lead, rhythm, gallop] = window._raceSynths;
    if (lead) lead.volume.value = VOL_RACE_LEAD + offset;
    if (rhythm) rhythm.volume.value = VOL_RACE_RHYTHM + offset;
    if (gallop) gallop.volume.value = VOL_RACE_GALLOP + offset;
  }
}
function setSfxVolume(val) {
  safeSetItem('sfxVolume', val);
}

// ── MENU MUSIC: chill, alegre pero relajada ──
let menuPart = null;
let racePart = null;

function beatsFromNotes(notes) {
  return notes.reduce((acc, n, i) => {
    const beats = notes.slice(0, i).reduce((s, x) => s + Tone.Time(x[1]).toSeconds(), 0);
    acc.push([beats, n]);
    return acc;
  }, []);
}
function durationOf(notes) {
  return notes.reduce((s, x) => s + Tone.Time(x[1]).toSeconds(), 0);
}

async function startMenuMusic() {
  if (musicMuted || currentMusic === 'menu') return;
  await loadTone();
  if (!Tone) return;
  stopAllMusic();
  currentMusic = 'menu';

  await Tone.start();

  // Reverb suave para dar ambiente "chill" sin necesitar archivos de audio
  const reverb = new Tone.Freeverb({ roomSize: 0.6, dampening: 3000, wet: 0.25 }).toDestination();

  const _volOffset = musicVolumeOffsetDb();

  // Voz principal: sine, ataque y release largos -> suave, nada estridente
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.25, decay: 0.3, sustain: 0.5, release: 1.4 }
  }).connect(reverb);
  synth.volume.value = VOL_MENU_LEAD + _volOffset;

  // Pad de acordes sostenidos en vez de línea de bajo saltarina
  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.8, decay: 0.4, sustain: 0.6, release: 2 }
  }).connect(reverb);
  pad.volume.value = VOL_MENU_PAD + _volOffset;

  // Melodía relajada, con espacio entre notas — nada de corcheas apuradas
  const mel = [
    ['E5','4n'], ['D5','4n'], ['C5','4n'], ['A4','2n'],
    ['G4','4n'], ['A4','4n'], ['C5','4n'], ['B4','2n'],
    ['E5','4n'], ['D5','4n'], ['C5','4n'], ['D5','2n'],
    ['C5','4n'], ['A4','4n'], ['G4','2n'],
  ];

  // Acordes largos sostenidos (un acorde por compás)
  const padChords = [
    [['C4','E4','G4'], '1n'],
    [['A3','C4','E4'], '1n'],
    [['F3','A3','C4'], '1n'],
    [['G3','B3','D4'], '1n'],
  ];

  Tone.Transport.bpm.value = 76;

  menuPart = new Tone.Part((time, note) => {
    synth.triggerAttackRelease(note[0], note[1], time);
  }, beatsFromNotes(mel));
  const totalDur = durationOf(mel);
  menuPart.loop = true;
  menuPart.loopEnd = totalDur;

  const padPart = new Tone.Part((time, chord) => {
    pad.triggerAttackRelease(chord[0], chord[1], time);
  }, padChords.reduce((acc, n, i) => {
    const beats = padChords.slice(0, i).reduce((s, x) => s + Tone.Time(x[1]).toSeconds(), 0);
    acc.push([beats, n]);
    return acc;
  }, []));
  const padDur = padChords.reduce((s, x) => s + Tone.Time(x[1]).toSeconds(), 0);
  padPart.loop = true;
  padPart.loopEnd = padDur;

  menuPart.start(0);
  padPart.start(0);
  Tone.Transport.start();

  window._menuSynth = synth;
  window._menuBass = pad; // se llama _menuBass por compatibilidad con stopAllMusic
  window._menuBassPart = padPart;
  window._menuReverb = reverb;
}

// ── RACE MUSIC: Guillermo Tell (galope), versión suavizada ──
// Misma melodía de siempre, pero con ondas triangulares (mucho menos
// estridentes que la cuadrada), menos BPM y volúmenes más bajos.
async function startRaceMusic() {
  if (musicMuted || currentMusic === 'race') return;
  await loadTone();
  if (!Tone) return;
  stopAllMusic();
  currentMusic = 'race';

  await Tone.start();

  const _volOffset = musicVolumeOffsetDb();

  // Lead — triangular en vez de cuadrada: mucho más suave al oído
  const lead = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.08, sustain: 0.4, release: 0.25 }
  }).toDestination();
  lead.volume.value = VOL_RACE_LEAD + _volOffset;

  // Rhythm "strings" — igual de suave, ya no sawtooth agresivo
  const rhythm = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 }
  }).toDestination();
  rhythm.volume.value = VOL_RACE_RHYTHM + _volOffset;

  // Bass gallop
  const gallop = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.12, sustain: 0.2, release: 0.15 }
  }).toDestination();
  gallop.volume.value = VOL_RACE_GALLOP + _volOffset;

  Tone.Transport.bpm.value = 132;

  // William Tell Overture finale melody — G major
  // The iconic "dah-dah-dah-dah-dah-dah" gallop theme
  const wtMelody = [
    // Phrase 1
    ['G4','8n'], ['G4','16n'], ['G4','16n'], ['G4','8n'], ['G4','8n'],
    ['A4','8n'], ['A4','16n'], ['A4','16n'], ['A4','4n'],
    ['B4','8n'], ['B4','16n'], ['B4','16n'], ['B4','8n'], ['B4','8n'],
    ['G4','8n'], ['G4','16n'], ['G4','16n'], ['G4','4n'],
    // Phrase 2
    ['D5','8n'], ['D5','16n'], ['D5','16n'], ['D5','8n'], ['D5','8n'],
    ['E5','8n'], ['E5','16n'], ['E5','16n'], ['E5','4n'],
    ['D5','4n'], ['B4','4n'], ['G4','4n'], ['D5','2n'],
    // Phrase 3 (high climax)
    ['G5','8n'], ['F#5','8n'], ['E5','8n'], ['D5','4n'], ['G5','8n'],
    ['G5','8n'], ['F#5','8n'], ['E5','8n'], ['D5','4n'], ['G5','8n'],
    ['A5','8n'], ['G5','8n'], ['F#5','8n'], ['G5','4n'], ['D5','8n'],
    ['G5','2n'], ['G5','4n'], ['G5','4n'],
  ];

  // Gallop rhythm pattern (repeated): short-short-long
  const gallopPattern = [
    ['G2','16n'], ['G2','16n'], ['G2','8n'],
    ['D3','16n'], ['D3','16n'], ['D3','8n'],
    ['G2','16n'], ['G2','16n'], ['G2','8n'],
    ['D3','16n'], ['D3','16n'], ['D3','8n'],
  ];

  // Rhythm stabs
  const rhythmPattern = [
    ['G3','16n'], ['G3','16n'], ['G3','16n'],
    ['D4','16n'], ['D4','16n'], ['D4','16n'],
    ['G3','16n'], ['G3','16n'], ['G3','16n'],
    ['D4','16n'], ['D4','16n'], ['D4','16n'],
  ];

  function notesToPart(notes) {
    let t = 0;
    return notes.map(n => {
      const entry = [t, n];
      t += Tone.Time(n[1]).toSeconds();
      return entry;
    });
  }

  const melDur = wtMelody.reduce((s, n) => s + Tone.Time(n[1]).toSeconds(), 0);
  const glpDur = gallopPattern.reduce((s, n) => s + Tone.Time(n[1]).toSeconds(), 0);

  const leadPart = new Tone.Part((time, note) => {
    lead.triggerAttackRelease(note[0], note[1], time);
  }, notesToPart(wtMelody));
  leadPart.loop = true;
  leadPart.loopEnd = melDur;

  const gallopPart = new Tone.Part((time, note) => {
    gallop.triggerAttackRelease(note[0], note[1], time);
  }, notesToPart(gallopPattern));
  gallopPart.loop = true;
  gallopPart.loopEnd = glpDur;

  const rhythmDur = rhythmPattern.reduce((s, n) => s + Tone.Time(n[1]).toSeconds(), 0);
  const rhythmPart = new Tone.Part((time, note) => {
    rhythm.triggerAttackRelease(note[0], note[1], time);
  }, notesToPart(rhythmPattern));
  rhythmPart.loop = true;
  rhythmPart.loopEnd = rhythmDur;

  leadPart.start(0);
  gallopPart.start(0);
  rhythmPart.start(0);
  Tone.Transport.start();

  window._raceParts = [leadPart, gallopPart, rhythmPart];
  window._raceSynths = [lead, rhythm, gallop];
}

function stopAllMusic() {
  try {
    if (Tone) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
    }
    ['_menuSynth','_menuBass'].forEach(k => {
      if (window[k]) { try { window[k].dispose(); } catch(e){} delete window[k]; }
    });
    if (window._menuBassPart) { try { window._menuBassPart.dispose(); } catch(e){} delete window._menuBassPart; }
    if (window._menuReverb) { try { window._menuReverb.dispose(); } catch(e){} delete window._menuReverb; }
    if (window._raceParts) { window._raceParts.forEach(p => { try { p.dispose(); } catch(e){} }); delete window._raceParts; }
    if (window._raceSynths) { window._raceSynths.forEach(s => { try { s.dispose(); } catch(e){} }); delete window._raceSynths; }
    if (menuPart) { try { menuPart.dispose(); } catch(e){} menuPart = null; }
    if (racePart) { try { racePart.dispose(); } catch(e){} racePart = null; }
  } catch(e) {}
  currentMusic = null;
}

function toggleMusic() {
  musicMuted = !musicMuted;
  document.querySelectorAll('.is-music-btn').forEach(btn => btn.classList.toggle('muted', musicMuted));

  if (musicMuted) {
    stopAllMusic();
  } else {
    // Resume appropriate music for current screen
    const active = document.querySelector('.screen.active');
    if (active && active.id === 'homeScreen') startMenuMusic();
    else if (active && active.id === 'gameScreen') startRaceMusic();
  }
}

// ── Patch showScreen to switch music ────
const _origShowScreen = showScreen;
window.showScreen = function(id) {
  _origShowScreen(id);
  if (!musicMuted) {
    if (id === 'homeScreen') startMenuMusic();
    else if (id === 'gameScreen') startRaceMusic();
    else if (currentMusic === 'race') stopAllMusic(); // secondary screens get silence
  }
};

// ── Patch launchGame to start race music ─
const _origLaunchGame = launchGame;
window.launchGame = function() {
  _origLaunchGame();
  if (!musicMuted) startRaceMusic();
};

// ── Patch returnHome ─────────────────────
const _origReturnHome = returnHome;
window.returnHome = function() {
  _origReturnHome();
  if (!musicMuted) startMenuMusic();
};

// ── Feedback háptico (vibración en dispositivos que lo soportan) ──
function vibrate(pattern) {
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
}

// ── Patch selectAnswer to play sounds + vibrar ───
const _origSelectAnswerAudio = selectAnswer;
window.selectAnswer = function(ans, idx) {
  const ch = state.currentChallenge;
  if (ch.answered) return;
  const isCorrect = ans === ch.correct;
  _origSelectAnswerAudio(ans, idx);
  if (isCorrect) {
    playCorrect();
    vibrate(30);
  } else {
    playWrong();
    vibrate(state.wrongStreak >= 3 ? [60, 40, 60, 40, 60] : [40, 30, 40]);
  }
};

// ── Patch doFireball for sound ───────────
const _origDoFireball = doFireball;
window.doFireball = function() {
  const ch = state.currentChallenge;
  if (!ch.answered || ch.selectedAnswer !== ch.correct) {
    _origDoFireball();
    return;
  }
  playFireball();
  _origDoFireball();
};

// ─────────────────────────────────────────
// Patch renderAnswerBtns to use window.selectAnswer
// (so it picks up the audio-patched version)
const _origRenderAnswerBtns = renderAnswerBtns;
window.renderAnswerBtns = function() {
  _origRenderAnswerBtns();
  // Re-wire onclick to patched version
  document.querySelectorAll('.answer-btn').forEach((btn, i) => {
    const ans = state.currentChallenge.answers[i];
    btn.onclick = () => window.selectAnswer(ans, i);
  });
};
