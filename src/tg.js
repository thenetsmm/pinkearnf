/* Telegram WebApp helpers + small UX utilities (haptics, sound, clipboard) */

export const WebApp = () => window.Telegram?.WebApp;

export function initTelegram() {
  const w = WebApp();
  if (!w) return;
  try {
    w.ready();
    w.expand();
    w.setHeaderColor?.('#ffe6ec');
    w.setBackgroundColor?.('#fff7fa');
    w.setBottomBarColor?.('#fff7fa');
    w.disableVerticalSwipes?.();
  } catch {
    /* older clients */
  }
}

/* ------------------------------ preferences ------------------------------ */
const KEY = 'pinkearn:prefs';
const defaults = { sound: true, haptics: true };
let prefs = { ...defaults };
try {
  prefs = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
} catch {
  /* storage unavailable */
}

export const getPrefs = () => ({ ...prefs });
export function setPref(name, value) {
  prefs = { ...prefs, [name]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/* -------------------------------- feedback -------------------------------- */
export function haptic(kind = 'success') {
  if (!prefs.haptics) return;
  const h = WebApp()?.HapticFeedback;
  if (!h) return;
  if (['success', 'error', 'warning'].includes(kind)) h.notificationOccurred?.(kind);
  else h.impactOccurred?.(kind === 'light' ? 'light' : 'medium');
}

let audio;
export function beep(kind = 'success') {
  if (!prefs.sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === 'success' ? [660, 880] : [220];
    notes.forEach((f, i) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, audio.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + i * 0.12 + 0.18);
      o.connect(g).connect(audio.destination);
      o.start(audio.currentTime + i * 0.12);
      o.stop(audio.currentTime + i * 0.12 + 0.2);
    });
  } catch {
    /* audio blocked */
  }
}

/* ---------------------------------- links ---------------------------------- */
export function openLink(url) {
  const w = WebApp();
  if (w?.openLink) w.openLink(url);
  else window.open(url, '_blank', 'noopener');
}

export function openTelegramLink(url) {
  const w = WebApp();
  if (w?.openTelegramLink) w.openTelegramLink(url);
  else window.open(url, '_blank', 'noopener');
}

export function shareInvite(link, appName = 'ShadowEarn') {
  const text = `Watch ads & earn points on ${appName} 💗 Join with my link:`;
  openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export const fmt = (n) => Number(n || 0).toLocaleString('en-US');
