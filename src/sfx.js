import { getPrefs } from './tg.js';

/* All sounds are synthesised with the Web Audio API, so no audio files are needed. */
let ctx;
function ac() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone({ f = 440, f2 = null, t = 0, d = 0.1, type = 'sine', v = 0.15 }) {
  const a = ac();
  if (!a || !getPrefs().sound) return;
  const o = a.createOscillator();
  const g = a.createGain();
  const t0 = a.currentTime + t;
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + d + 0.02);
}

function noise({ t = 0, d = 0.12, v = 0.12, from = 1800, to = 5000 }) {
  const a = ac();
  if (!a || !getPrefs().sound) return;
  const len = Math.max(1, Math.floor(a.sampleRate * d));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  const t0 = a.currentTime + t;
  bp.frequency.setValueAtTime(from, t0);
  bp.frequency.exponentialRampToValueAtTime(to, t0 + d);
  bp.Q.value = 1.2;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + d * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(bp).connect(g).connect(a.destination);
  src.start(t0);
}

export const sfx = {
  unlock: () => ac(),
  click: () => tone({ f: 520, f2: 360, d: 0.06, type: 'triangle', v: 0.1 }),
  tick: () => tone({ f: 1500, f2: 900, d: 0.035, type: 'square', v: 0.05 }),
  pop: () => {
    tone({ f: 300, f2: 700, d: 0.1, type: 'triangle', v: 0.18 });
    noise({ d: 0.08, v: 0.08, from: 2500, to: 6000 });
  },
  whoosh: () => noise({ d: 0.28, v: 0.16, from: 500, to: 3500 }),
  sparkle: () => [1568, 2093, 2637, 3136].forEach((f, i) => tone({ f, t: i * 0.07, d: 0.18, v: 0.07 })),
  scratch: () => noise({ d: 0.09, v: 0.1, from: 3000, to: 7000 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone({ f, t: i * 0.1, d: i === 3 ? 0.5 : 0.18, type: 'triangle', v: 0.16 })),
  tada: () => {
    tone({ f: 523, d: 0.14, type: 'triangle', v: 0.16 });
    tone({ f: 659, t: 0.12, d: 0.14, type: 'triangle', v: 0.16 });
    [784, 988, 1319].forEach((f) => tone({ f, t: 0.26, d: 0.7, type: 'triangle', v: 0.12 }));
  },
  lose: () => {
    tone({ f: 330, f2: 220, d: 0.25, type: 'sawtooth', v: 0.07 });
    tone({ f: 262, f2: 165, t: 0.22, d: 0.35, type: 'sawtooth', v: 0.07 });
  },
};

/** Soft click sound on every button in the app. */
export function installClickSounds() {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const b = e.target.closest?.('button, .btn, [role="button"]');
      if (b && !b.disabled && !b.classList.contains('mbox') && !b.closest('.scratch-card')) sfx.click();
    },
    { passive: true }
  );
}
