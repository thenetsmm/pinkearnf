const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const hasTelegram = () => !!window.Telegram?.WebApp?.initData;
export const canUseDevUser = () => !!import.meta.env.VITE_DEV_USER;

/** Calls the backend. Telegram initData is sent as `Authorization: tma <initData>`. */
export async function api(path, { method = 'GET', body, headers: extra } = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const initData = window.Telegram?.WebApp?.initData;
  if (initData) headers.Authorization = 'tma ' + initData;
  else if (import.meta.env.VITE_DEV_USER) headers['x-dev-user'] = import.meta.env.VITE_DEV_USER;

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    const e = new Error('Cannot reach the server. Check your connection and try again.');
    e.code = 'network';
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.message || 'Something went wrong');
    e.code = data.error || 'error';
    e.status = res.status;
    throw e;
  }
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * POST that retries while the ad provider's server callback has not arrived yet
 * (awaiting_provider) or the ad timer is a hair short (too_early).
 */
export async function postRetry(path, body, tries = 5) {
  for (let i = 0; i < tries; i += 1) {
    try {
      return await api(path, { method: 'POST', body });
    } catch (e) {
      if ((e.code === 'awaiting_provider' || e.code === 'too_early') && i < tries - 1) await sleep(1500);
      else throw e;
    }
  }
  return null;
}
