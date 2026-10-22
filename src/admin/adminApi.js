import { api } from '../api.js';

let pin = '';
try {
  pin = sessionStorage.getItem('se_admin_pin') || '';
} catch {
  /* storage unavailable */
}

export const hasPin = () => !!pin;
export function setPin(p) {
  pin = p;
  try {
    p ? sessionStorage.setItem('se_admin_pin', p) : sessionStorage.removeItem('se_admin_pin');
  } catch {
    /* ignore */
  }
}

/** Calls /api/admin/*. The Telegram identity travels as usual; the PIN goes in x-admin-pin. */
export const adminApi = (path, opts = {}) => api('/api/admin' + path, { ...opts, headers: { 'x-admin-pin': pin } });
