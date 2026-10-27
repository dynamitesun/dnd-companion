// Procedural ambience made with Web Audio — no audio files needed.
// Lives outside React so sound keeps playing while you switch screens.
let ctx = null;
let master = null;
const layers = {}; // name -> { gain, stop() }
const clips = {}; // id -> HTMLAudioElement

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(type = 'white', seconds = 4) {
  const c = ac();
  const len = c.sampleRate * seconds;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (type === 'pink') {
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    } else if (type === 'brown') {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w * 0.5;
  }
  return buf;
}

function noiseSource(type) {
  const c = ac();
  const s = c.createBufferSource();
  s.buffer = noiseBuffer(type);
  s.loop = true;
  return s;
}

const BUILDERS = {
  rain(out) {
    const c = ac();
    const n = noiseSource('pink');
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
    n.connect(hp).connect(lp).connect(out);
    n.start();
    return () => n.stop();
  },
  wind(out) {
    const c = ac();
    const n = noiseSource('brown');
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.8;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.08;
    const lg = c.createGain(); lg.gain.value = 250;
    lfo.connect(lg).connect(bp.frequency);
    const g = c.createGain(); g.gain.value = 1.4;
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.13;
    const lg2 = c.createGain(); lg2.gain.value = 0.6;
    lfo2.connect(lg2).connect(g.gain);
    n.connect(bp).connect(g).connect(out);
    n.start(); lfo.start(); lfo2.start();
    return () => { n.stop(); lfo.stop(); lfo2.stop(); };
  },
  fire(out) {
    const c = ac();
    const n = noiseSource('brown');
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const g = c.createGain(); g.gain.value = 0.9;
    n.connect(lp).connect(g).connect(out);
    n.start();
    let alive = true;
    const crackle = () => {
      if (!alive) return;
      const t = c.currentTime;
      const s = c.createBufferSource(); s.buffer = noiseBuffer('white', 0.05);
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500 + Math.random() * 3000;
      const eg = c.createGain(); eg.gain.setValueAtTime(0.3 + Math.random() * 0.5, t); eg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      s.connect(hp).connect(eg).connect(out); s.start(t);
      setTimeout(crackle, 40 + Math.random() * 260);
    };
    crackle();
    return () => { alive = false; n.stop(); };
  },
  drips(out) {
    const c = ac();
    let alive = true;
    const drip = () => {
      if (!alive) return;
      const t = c.currentTime;
      const o = c.createOscillator(); o.type = 'sine';
      const f = 900 + Math.random() * 1400;
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.4, t + 0.12);
      const g = c.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      const d = c.createDelay(); d.delayTime.value = 0.18; const fb = c.createGain(); fb.gain.value = 0.35;
      o.connect(g); g.connect(out); g.connect(d); d.connect(fb).connect(d); d.connect(out);
      o.start(t); o.stop(t + 0.3);
      setTimeout(drip, 500 + Math.random() * 2500);
    };
    drip();
    const n = noiseSource('brown');
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 120;
    const g = c.createGain(); g.gain.value = 0.5;
    n.connect(lp).connect(g).connect(out); n.start();
    return () => { alive = false; n.stop(); };
  },
  drone(out) {
    const c = ac();
    const freqs = [55, 82.4, 110.3, 65.4];
    const oscs = freqs.map((f, i) => {
      const o = c.createOscillator(); o.type = i % 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 12;
      return o;
    });
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.05; const lg = c.createGain(); lg.gain.value = 120;
    lfo.connect(lg).connect(lp.frequency);
    const g = c.createGain(); g.gain.value = 0.12;
    oscs.forEach((o) => o.connect(lp)); lp.connect(g).connect(out);
    oscs.forEach((o) => o.start()); lfo.start();
    return () => { oscs.forEach((o) => o.stop()); lfo.stop(); };
  },
  heartbeat(out) {
    const c = ac();
    let alive = true;
    const thump = (t, v) => {
      const o = c.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.2);
    };
    const beat = () => {
      if (!alive) return;
      const t = c.currentTime;
      thump(t, 0.9); thump(t + 0.28, 0.6);
      setTimeout(beat, 1000);
    };
    beat();
    return () => { alive = false; };
  },
  tavern(out) {
    const c = ac();
    const n = noiseSource('pink');
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 1.2;
    const g = c.createGain(); g.gain.value = 0.8;
    const lfo = c.createOscillator(); lfo.frequency.value = 3.1; const lg = c.createGain(); lg.gain.value = 0.25;
    lfo.connect(lg).connect(g.gain);
    n.connect(bp).connect(g).connect(out); n.start(); lfo.start();
    let alive = true;
    const clink = () => {
      if (!alive) return;
      const t = c.currentTime;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 2400 + Math.random() * 1800;
      const eg = c.createGain(); eg.gain.setValueAtTime(0.08, t); eg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(eg).connect(out); o.start(t); o.stop(t + 0.35);
      setTimeout(clink, 1500 + Math.random() * 5000);
    };
    clink();
    return () => { alive = false; n.stop(); lfo.stop(); };
  },
  water(out) {
    const c = ac();
    const n = noiseSource('pink');
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 0.6;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.3; const lg = c.createGain(); lg.gain.value = 500;
    lfo.connect(lg).connect(bp.frequency);
    n.connect(bp).connect(out); n.start(); lfo.start();
    return () => { n.stop(); lfo.stop(); };
  },
};

const ONESHOTS = {
  thunder() {
    const c = ac(); const t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = noiseBuffer('brown', 5);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(80, t + 4);
    const g = c.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(2.5, t + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + 4.8);
    s.connect(lp).connect(g).connect(master); s.start(t);
  },
  bell() {
    const c = ac(); const t = c.currentTime;
    [1, 2.76, 5.4, 8.9].forEach((m, i) => {
      const o = c.createOscillator(); o.frequency.value = 220 * m;
      const g = c.createGain(); g.gain.setValueAtTime(0.25 / (i + 1), t); g.gain.exponentialRampToValueAtTime(0.001, t + 5 / (i + 1));
      o.connect(g).connect(master); o.start(t); o.stop(t + 5);
    });
  },
  howl() {
    const c = ac(); const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(380, t); o.frequency.linearRampToValueAtTime(620, t + 0.8); o.frequency.linearRampToValueAtTime(560, t + 2.2); o.frequency.linearRampToValueAtTime(330, t + 3);
    const vib = c.createOscillator(); vib.frequency.value = 5; const vg = c.createGain(); vg.gain.value = 8; vib.connect(vg).connect(o.frequency);
    const g = c.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.25, t + 0.5); g.gain.linearRampToValueAtTime(0.2, t + 2.3); g.gain.exponentialRampToValueAtTime(0.001, t + 3.1);
    o.connect(g).connect(master); o.start(t); vib.start(t); o.stop(t + 3.2); vib.stop(t + 3.2);
  },
  scream() {
    const c = ac(); const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(400, t + 1.2);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 3;
    const g = c.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.2, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    o.connect(bp).connect(g).connect(master); o.start(t); o.stop(t + 1.4);
  },
  door() {
    const c = ac(); const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(260, t + 0.6); o.frequency.linearRampToValueAtTime(140, t + 1.4);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 8;
    const g = c.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.18, t + 0.1); g.gain.linearRampToValueAtTime(0.001, t + 1.5);
    o.connect(bp).connect(g).connect(master); o.start(t); o.stop(t + 1.6);
  },
};

export const LAYER_NAMES = { rain: '🌧️ Rain', wind: '🌬️ Wind', fire: '🔥 Fire', drips: '💧 Cave', drone: '🌫️ Dread', heartbeat: '❤️ Heartbeat', tavern: '🍺 Tavern', water: '🌊 River' };
export const ONESHOT_NAMES = { thunder: '⚡ Thunder', bell: '🔔 Bell', howl: '🐺 Howl', scream: '😱 Scream', door: '🚪 Creak' };

export function setLayer(name, volume) {
  ac();
  const L = layers[name];
  if (volume <= 0) {
    if (L) {
      L.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      setTimeout(() => { try { L.stop(); } catch {} }, 1500);
      delete layers[name];
    }
    return;
  }
  if (L) {
    L.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.3);
    return;
  }
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(master);
  const stop = BUILDERS[name](gain);
  gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.6);
  layers[name] = { gain, stop };
}
export const getLayers = () => Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.gain.gain.value]));
export function stopAll() {
  Object.keys(layers).forEach((k) => setLayer(k, 0));
  Object.values(clips).forEach((a) => a.pause());
}
export const playOneShot = (name) => ONESHOTS[name]?.();
export function setMaster(v) { ac(); master.gain.value = v; }

export function playClip(id, url, loop, volume = 0.8) {
  let a = clips[id];
  if (!a) { a = new Audio(url); clips[id] = a; }
  a.loop = loop;
  a.volume = volume;
  if (a.paused) { a.currentTime = 0; a.play(); } else a.pause();
  return !a.paused;
}
export const clipPlaying = (id) => clips[id] && !clips[id].paused;
