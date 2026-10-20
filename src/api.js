const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const hasTelegram = () => !!window.Telegram?.WebApp?.initData;
export const canUseDevUser = () => !!import.meta.env.VITE_DEV_USER;

/** Calls the backend. Telegram initData is sent as `Authorization: tma <initData>`. */
export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
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
