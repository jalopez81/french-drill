import { useCallback, useState } from 'react';
import { splitIntoSentences } from '../utils/sentenceSplitter';
import { uniqueWords } from '../utils/wordExtractor';
import {
  getCachedTranslation,
  isManualTranslation,
  removeCachedTranslation,
  setManualTranslation,
  translateBulk,
  translateToSpanish,
} from '../utils/translate';

export function useTranslation() {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set());
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);

  const syncFromCache = useCallback((keys: string[]) => {
    setTranslations((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const key of keys) {
        const cached = getCachedTranslation(key);
        if (cached && next[key] !== cached) {
          next[key] = cached;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, []);

  const getTranslation = useCallback((text: string): string | null => {
    const key = text.trim();
    return translations[key] ?? getCachedTranslation(key);
  }, [translations]);

  const isLoading = useCallback(
    (text: string): boolean => loadingKeys.has(text.trim()),
    [loadingKeys],
  );

  const hasError = useCallback(
    (text: string): boolean => errorKeys.has(text.trim()),
    [errorKeys],
  );

  const isManual = useCallback((text: string): boolean => isManualTranslation(text.trim()), []);

  const fetchTranslation = useCallback(async (text: string, options?: { force?: boolean }) => {
    const key = text.trim();
    if (!key) return;

    if (!options?.force) {
      const cached = getCachedTranslation(key);
      if (cached) {
        setTranslations((prev) => (prev[key] ? prev : { ...prev, [key]: cached }));
        return;
      }
    } else {
      removeCachedTranslation(key);
    }

    let shouldFetch = false;
    setLoadingKeys((prev) => {
      if (prev.has(key)) return prev;
      shouldFetch = true;
      return new Set(prev).add(key);
    });

    if (!shouldFetch) return;

    setErrorKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

    try {
      const translated = await translateToSpanish(key, { force: options?.force });
      setTranslations((prev) => ({ ...prev, [key]: translated }));
    } catch {
      setErrorKeys((prev) => new Set(prev).add(key));
    } finally {
      setLoadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, []);

  const saveManualTranslation = useCallback((text: string, translation: string) => {
    const key = text.trim();
    const value = translation.trim();
    if (!key || !value) return;

    setManualTranslation(key, value);
    setTranslations((prev) => ({ ...prev, [key]: value }));
    setErrorKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const translateAllText = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return { ok: false as const, count: 0 };

    const sentences = splitIntoSentences(trimmed);
    const words = uniqueWords(trimmed);
    const items = [...new Set([...sentences, ...words])];

    setIsTranslatingAll(true);
    setErrorKeys((prev) => {
      const next = new Set(prev);
      items.forEach((item) => next.delete(item));
      return next;
    });

    try {
      const bulk = await translateBulk(items);
      setTranslations((prev) => ({ ...prev, ...bulk }));
      return { ok: true as const, count: Object.keys(bulk).length };
    } catch {
      items.forEach((item) => {
        setErrorKeys((prev) => new Set(prev).add(item));
      });
      return { ok: false as const, count: 0 };
    } finally {
      setIsTranslatingAll(false);
    }
  }, []);

  const isTextFullyTranslated = useCallback(
    (content: string): boolean => {
      const trimmed = content.trim();
      if (!trimmed) return false;

      const items = [...new Set([...splitIntoSentences(trimmed), ...uniqueWords(trimmed)])];
      return items.every((item) => Boolean(getTranslation(item)));
    },
    [getTranslation],
  );

  return {
    getTranslation,
    isLoading,
    hasError,
    isManual,
    fetchTranslation,
    saveManualTranslation,
    translateAllText,
    isTranslatingAll,
    isTextFullyTranslated,
    syncFromCache,
  };
}
