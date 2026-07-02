import type { VocabEntry } from '../types';
import { clearAllCachedAudio, removeCachedAudio } from './audioCache';
import { isManualTranslation, removeCachedTranslation, translateBulk } from './translate';

export interface RegenerateProgress {
  done: number;
  total: number;
  phase: 'translate' | 'audio';
  current?: string;
  remaining?: number;
}

export interface RegenerateResult {
  translations: Record<string, string>;
  translated: number;
  skippedManual: number;
  audioCount: number;
  failed: number;
}

export async function regenerateWordAssets(
  word: string,
  options?: { skipManual?: boolean; refreshAudio?: boolean },
): Promise<{ translation: string | null }> {
  if (options?.skipManual !== false && isManualTranslation(word)) {
    if (options?.refreshAudio !== false) await removeCachedAudio(word);
    return { translation: null };
  }

  removeCachedTranslation(word);
  if (options?.refreshAudio !== false) await removeCachedAudio(word);

  try {
    const bulk = await translateBulk([word]);
    return { translation: bulk.translations[word] ?? null };
  } catch {
    return { translation: null };
  }
}

export async function regenerateVocabularyAssets(
  entries: VocabEntry[],
  prefetchSpeech: (
    words: string[],
    options?: { onProgress?: (progress: { done: number; total: number; remaining: number; current?: string }) => void },
  ) => Promise<number>,
  options?: {
    skipManual?: boolean;
    prefetchAudio?: boolean;
    onProgress?: (progress: RegenerateProgress) => void;
  },
): Promise<RegenerateResult> {
  const skipManual = options?.skipManual ?? true;
  const words = entries.map((entry) => entry.word);
  const toRegenerate: string[] = [];
  let skippedManual = 0;

  for (const word of words) {
    if (skipManual && isManualTranslation(word)) {
      skippedManual += 1;
      await removeCachedAudio(word);
    } else {
      removeCachedTranslation(word);
      await removeCachedAudio(word);
      toRegenerate.push(word);
    }
  }

  options?.onProgress?.({
    done: 0,
    total: words.length,
    phase: 'translate',
  });

  let translations: Record<string, string> = {};
  let translated = 0;
  let failed = 0;

  if (toRegenerate.length > 0) {
    try {
      const bulk = await translateBulk(toRegenerate);
      translations = bulk.translations;
      translated = Object.keys(translations).length;
      failed = toRegenerate.length - translated;
    } catch {
      failed = toRegenerate.length;
    }
  }

  options?.onProgress?.({
    done: words.length,
    total: words.length,
    phase: 'translate',
  });

  let audioCount = 0;

  if (options?.prefetchAudio !== false) {
    await clearAllCachedAudio();
    audioCount = await prefetchSpeech(words, {
      onProgress: (audio) => {
        options?.onProgress?.({
          done: audio.done,
          total: audio.total,
          phase: 'audio',
          current: audio.current,
          remaining: audio.remaining,
        });
      },
    });
  }

  return { translations, translated, skippedManual, audioCount, failed };
}
