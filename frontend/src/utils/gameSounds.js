






let sharedAudioContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;

  if (!sharedAudioContext) {
    try {
      sharedAudioContext = new Ctor();
    } catch (e) {
      console.warn("[gameSounds] Context create failed:", e);
      return null;
    }
  }

  if (sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}



function isSoundEnabled() {
  try {
    const s = JSON.parse(
      window.localStorage.getItem("settings") || "{}"
    );
    if (s.soundEnabled === false) return false;
    if (s.soundEffects === false) return false;
    if (s.muteSound === true) return false;
    if (s.muted === true) return false;
  } catch {
    
  }
  return true;
}

function isMusicEnabled() {
  try {
    const s = JSON.parse(
      window.localStorage.getItem("settings") || "{}"
    );
    if (s.musicEnabled === false) return false;
    if (s.soundEnabled === false) return false;
  } catch {
    
  }
  return true;
}

function getMusicVolume() {
  try {
    const s = JSON.parse(
      window.localStorage.getItem("settings") || "{}"
    );
    const v = Number(s.musicVolume);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 100) / 100 : 0.25;
  } catch {
    return 0.25;
  }
}

function clampVolume(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 100) / 100;
}




let audioUnlocked = false;

export function unlockAudio() {
  if (audioUnlocked) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const tryUnlock = () => {
    if (ctx.state === "running") {
      audioUnlocked = true;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.01);
      } catch {
        
      }
    }
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(tryUnlock).catch(() => {});
  } else {
    tryUnlock();
  }
}

if (typeof window !== "undefined" && !audioUnlocked) {
  const handler = () => {
    unlockAudio();
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
    window.removeEventListener("touchstart", handler);
  };
  window.addEventListener("pointerdown", handler, { once: true });
  window.addEventListener("keydown", handler, { once: true });
  window.addEventListener("touchstart", handler, { once: true });
}




function actuallyPlayTone(ctx, opts) {
  const {
    frequency,
    endFrequency,
    duration,
    type,
    volume,
    attack,
    delay,
    startTime,
  } = opts;

  const now = (startTime ?? ctx.currentTime) + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);

  if (endFrequency !== null && endFrequency !== frequency) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(0.001, endFrequency),
      now + duration
    );
  }

  const safeVol = Math.max(0.001, Math.min(1, volume));

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(safeVol, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playTone(opts) {
  const ctx = getAudioContext();
  if (!ctx) return null;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
    if (ctx.resume) {
      ctx
        .resume()
        .then(() => {
          if (ctx.state === "running") {
            actuallyPlayTone(ctx, opts);
          }
        })
        .catch(() => {});
    }
    return null;
  }

  try {
    actuallyPlayTone(ctx, opts);
  } catch (e) {
    console.warn("[gameSounds] playTone error:", e);
  }
  return null;
}




function soundCorrect(volume) {
  playTone({
    frequency: 660,
    endFrequency: 880,
    duration: 0.12,
    type: "sine",
    volume: 0.15 * volume,
    attack: 0.012,
  });
  playTone({
    frequency: 880,
    endFrequency: 1046.5,
    duration: 0.1,
    type: "sine",
    volume: 0.1 * volume,
    delay: 0.08,
    attack: 0.008,
  });
}

function soundIncorrect(volume) {
  playTone({
    frequency: 280,
    endFrequency: 180,
    duration: 0.15,
    type: "sine",
    volume: 0.13 * volume,
    attack: 0.01,
  });
  playTone({
    frequency: 220,
    endFrequency: 140,
    duration: 0.12,
    type: "sine",
    volume: 0.08 * volume,
    delay: 0.1,
    attack: 0.008,
  });
}

function soundTick(volume) {
  playTone({
    frequency: 1000,
    duration: 0.05,
    type: "sine",
    volume: 0.08 * volume,
    attack: 0.002,
  });
}

function soundTimeWarning(volume) {
  playTone({
    frequency: 880,
    duration: 0.1,
    type: "square",
    volume: 0.1 * volume,
    attack: 0.005,
  });
  playTone({
    frequency: 660,
    duration: 0.15,
    type: "square",
    volume: 0.1 * volume,
    delay: 0.12,
    attack: 0.005,
  });
}

function soundTimeUp(volume) {
  
  const notes = [880, 660, 550, 440];
  notes.forEach((freq, i) => {
    playTone({
      frequency: freq,
      endFrequency: freq * 0.9,
      duration: 0.18,
      type: "sawtooth",
      volume: 0.1 * volume,
      attack: 0.01,
      delay: i * 0.1,
    });
  });
}

function soundVictory(volume) {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    playTone({
      frequency: freq,
      duration: 0.22,
      type: "triangle",
      volume: 0.13 * volume,
      attack: 0.02,
      delay: i * 0.09,
    });
  });
}

function soundGameOver(volume) {
  const notes = [440, 349.23, 293.66, 220];
  notes.forEach((freq, i) => {
    playTone({
      frequency: freq,
      duration: 0.2,
      type: "sine",
      volume: 0.11 * volume,
      attack: 0.01,
      delay: i * 0.12,
    });
  });
}

function soundClick(volume) {
  playTone({
    frequency: 800,
    duration: 0.06,
    type: "sine",
    volume: 0.1 * volume,
    attack: 0.002,
  });
}

function soundCombo(volume) {
  const notes = [880, 1046.5, 1318.5];
  notes.forEach((freq, i) => {
    playTone({
      frequency: freq,
      duration: 0.08,
      type: "sine",
      volume: 0.11 * volume,
      attack: 0.004,
      delay: i * 0.05,
    });
  });
}




const RESULT_HANDLERS = {
  CORRECT: soundCorrect,
  INCORRECT: soundIncorrect,
  WRONG: soundIncorrect,
  TICK: soundTick,
  TIME_WARNING: soundTimeWarning,
  TIME_UP: soundTimeUp,
  TIME_EXPIRED: soundTimeUp,
  VICTORY: soundVictory,
  COMPLETE: soundVictory,
  GAME_OVER: soundGameOver,
  FAILED: soundGameOver,
  CLICK: soundClick,
  COMBO: soundCombo,
};

export function playGameSound(result, volumeLevel = 100) {
  const volume = clampVolume(volumeLevel);
  if (volume === 0) return;
  if (!isSoundEnabled()) return;

  const key = String(result || "").toUpperCase();
  const handler = RESULT_HANDLERS[key];
  if (!handler) return;

  try {
    handler(volume);
  } catch (e) {
    console.warn("[gameSounds] play failed:", e);
  }
}



let musicNodes = null;
let musicLoopTimeout = null;


const MELODY = [
  
  { note: 440.0, duration: 0.4 }, 
  { note: 523.25, duration: 0.4 }, 
  { note: 587.33, duration: 0.4 }, 
  { note: 659.25, duration: 0.4 }, 
  { note: 587.33, duration: 0.4 }, 
  { note: 523.25, duration: 0.4 }, 
  { note: 440.0, duration: 0.6 }, 
  { note: 392.0, duration: 0.4 }, 
  { note: 440.0, duration: 0.4 }, 
  { note: 523.25, duration: 0.4 }, 
  { note: 440.0, duration: 0.6 }, 
  { note: 0, duration: 0.6 }, 
];

function scheduleMelodyNote(ctx, noteData, startTime, masterGain) {
  if (!noteData.note || noteData.note === 0) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(noteData.note, startTime);

  const peak = 0.06;

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(
    peak,
    startTime + 0.03
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + noteData.duration
  );

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(startTime);
  osc.stop(startTime + noteData.duration + 0.05);
}

export function startBackgroundMusic() {
  if (musicNodes) return; 
  if (!isMusicEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  
  if (ctx.state !== "running") {
    ctx.resume().catch(() => {});
    
    setTimeout(() => {
      if (ctx.state === "running" && !musicNodes) {
        startBackgroundMusic();
      }
    }, 300);
    return;
  }

  const masterGain = ctx.createGain();
  masterGain.gain.value = getMusicVolume();
  masterGain.connect(ctx.destination);

  musicNodes = { ctx, masterGain, stopped: false };

  
  const playLoop = () => {
    if (!musicNodes || musicNodes.stopped) return;

    const startTime = ctx.currentTime + 0.05;
    let cursor = startTime;

    for (const noteData of MELODY) {
      scheduleMelodyNote(ctx, noteData, cursor, masterGain);
      cursor += noteData.duration;
    }

    const totalDuration = cursor - startTime;
    const pauseBetweenLoops = 1.2;

    musicLoopTimeout = window.setTimeout(
      () => {
        playLoop();
      },
      (totalDuration + pauseBetweenLoops) * 1000
    );
  };

  playLoop();
}

export function stopBackgroundMusic() {
  if (musicLoopTimeout) {
    window.clearTimeout(musicLoopTimeout);
    musicLoopTimeout = null;
  }
  if (musicNodes) {
    try {
      
      const { ctx, masterGain } = musicNodes;
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(
        masterGain.gain.value,
        now
      );
      masterGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.3
      );

      musicNodes.stopped = true;

      window.setTimeout(() => {
        try {
          masterGain.disconnect();
        } catch {
          
        }
      }, 400);
    } catch {
      
    }
    musicNodes = null;
  }
}

export function setMusicVolume(volumeLevel = 100) {
  if (!musicNodes) return;
  const ctx = musicNodes.ctx;
  const v = Math.max(0.0001, clampVolume(volumeLevel) * 0.4);
  try {
    musicNodes.masterGain.gain.setValueAtTime(
      v,
      ctx.currentTime
    );
  } catch {
    
  }
}




export const playCorrectSound = (v = 100) =>
  playGameSound("CORRECT", v);
export const playIncorrectSound = (v = 100) =>
  playGameSound("INCORRECT", v);
export const playTickSound = (v = 100) =>
  playGameSound("TICK", v);
export const playVictorySound = (v = 100) =>
  playGameSound("VICTORY", v);
export const playGameOverSound = (v = 100) =>
  playGameSound("GAME_OVER", v);
export const playClickSound = (v = 100) =>
  playGameSound("CLICK", v);
export const playComboSound = (v = 100) =>
  playGameSound("COMBO", v);
export const playTimeUpSound = (v = 100) =>
  playGameSound("TIME_UP", v);