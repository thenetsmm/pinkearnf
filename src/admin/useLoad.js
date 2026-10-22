import { useCallback, useEffect, useState } from 'react';

/** Loads data and exposes reload(). */
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    try {
      setData(await fn());
      setError('');
    } catch (e) {
      setError(e.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    setData(null);
    load();
  }, [load]);
  return { data, error, reload: load };
}
