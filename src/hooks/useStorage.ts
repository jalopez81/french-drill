import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchState as fetchFromJsonBin, saveState as saveToJsonBin } from '../utils/jsonbinClient';

const SAVE_DEBOUNCE_MS = 2000;

export interface UseStorageResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fetchState: () => Promise<T | null>;
  updateData: (newState: T) => void;
  flushUpdate: () => Promise<void>;
}

export function useStorage<T>(options?: { autoFetch?: boolean }): UseStorageResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingRef = useRef<T | null>(null);
  const timerRef = useRef<number | null>(null);
  const savingRef = useRef(false);

  const flushUpdate = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const next = pendingRef.current;
    if (next === null || savingRef.current) return;

    savingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      await saveToJsonBin(next);
      pendingRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar en JSONBin');
      throw err;
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  }, []);

  const updateData = useCallback(
    (newState: T) => {
      setData(newState);
      pendingRef.current = newState;
      setError(null);

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void flushUpdate();
      }, SAVE_DEBOUNCE_MS);
    },
    [flushUpdate],
  );

  const fetchState = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const record = await fetchFromJsonBin<T>();
      setData(record);
      return record;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al leer JSONBin';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.autoFetch) {
      void fetchState();
    }

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [fetchState, options?.autoFetch]);

  return {
    data,
    loading,
    error,
    fetchState,
    updateData,
    flushUpdate,
  };
}
