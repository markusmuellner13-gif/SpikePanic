let ctx = null;
let masterGain, musicGain, sfxGain;
let musicLoop = null;
let musicPlaying = false;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.5;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.8;
    sfxGain.connect(masterGain);
  }
  return ctx;
}

function playTone(freq, type, duration, vol, startDelay = 0, fadeOut = true) {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  if (fadeOut) {
    gain.gain.setValueAtTime(vol, c.currentTime + startDelay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + duration);
  }
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(c.currentTime + startDelay);
  osc.stop(c.currentTime + startDelay + duration + 0.01);
}

function playNoise(duration, vol, filterFreq = 2000) {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 1;
  const gain = c.createGain();
  gain.gain.value = vol;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  src.start();
  src.stop(c.currentTime + duration);
}

export const Audio = {
  setMusicVol(v)  { if (musicGain) musicGain.gain.value = v; },
  setSfxVol(v)    { if (sfxGain)   sfxGain.gain.value = v; },
  setMasterVol(v) { if (masterGain) masterGain.gain.value = v; },

  jump() {
    playTone(220, 'square', 0.08, 0.3);
    playTone(330, 'square', 0.12, 0.2, 0.05);
  },

  land() {
    playTone(80, 'triangle', 0.1, 0.4);
  },

  die() {
    playTone(440, 'sawtooth', 0.05, 0.5);
    playTone(330, 'sawtooth', 0.1, 0.4, 0.06);
    playTone(220, 'sawtooth', 0.15, 0.4, 0.13);
    playTone(110, 'sawtooth', 0.2, 0.5, 0.21);
    playNoise(0.3, 0.2, 500);
  },

  win() {
    [523, 659, 784, 1047].forEach((f, i) => {
      playTone(f, 'square', 0.2, 0.4, i * 0.12);
    });
    playTone(1047, 'square', 0.5, 0.5, 0.5);
  },

  bounce() {
    playTone(660, 'sine', 0.12, 0.3);
    playTone(880, 'sine', 0.08, 0.2, 0.05);
  },

  click() {
    playTone(800, 'square', 0.05, 0.3);
  },

  coin() {
    [660, 880].forEach((f, i) => playTone(f, 'sine', 0.15, 0.3, i * 0.08));
  },

  achievement() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      playTone(f, 'triangle', 0.25, 0.4, i * 0.1);
    });
  },

  startMusic() {
    if (musicPlaying) return;
    musicPlaying = true;
    const c = getCtx();
    if (c.state === 'suspended') c.resume();

    const melody = [
      [220, 0.3], [246, 0.3], [261, 0.3], [293, 0.3],
      [329, 0.3], [293, 0.3], [261, 0.3], [246, 0.3],
      [220, 0.3], [246, 0.3], [293, 0.6],
      [329, 0.3], [369, 0.3], [329, 0.3], [293, 0.3],
      [261, 0.6], [246, 0.3], [261, 0.3],
    ];

    let step = 0;
    const playNext = () => {
      if (!musicPlaying) return;
      const [freq, dur] = melody[step % melody.length];
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.value = 0.15;
      g.gain.setValueAtTime(0.15, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur * 0.9);
      osc.connect(g);
      g.connect(musicGain);
      osc.start();
      osc.stop(c.currentTime + dur);
      step++;
      musicLoop = setTimeout(playNext, dur * 1000);
    };
    playNext();

    const bass = [110, 110, 146, 110, 130, 146, 110, 130];
    let bi = 0;
    const playBass = () => {
      if (!musicPlaying) return;
      const freq = bass[bi % bass.length];
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      g.gain.value = 0.08;
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.58);
      osc.connect(g);
      g.connect(musicGain);
      osc.start();
      osc.stop(c.currentTime + 0.6);
      bi++;
      setTimeout(playBass, 600);
    };
    setTimeout(playBass, 100);
  },

  stopMusic() {
    musicPlaying = false;
    if (musicLoop) clearTimeout(musicLoop);
    musicLoop = null;
  },

  resume() {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume();
  },
};
