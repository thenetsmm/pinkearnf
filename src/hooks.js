import { useEffect, useState } from 'react';

/** Counts down from `initial` seconds (re-synced whenever `initial` changes, e.g. after a server refresh). */
export function useCountdown(initial) {
  const [sec, setSec] = useState(initial || 0);
  useEffect(() => setSec(initial || 0), [initial]);
  useEffect(() => {
    if (sec <= 0) return undefined;
    const t = setTimeout(() => setSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [sec]);
  return sec;
}

export const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
