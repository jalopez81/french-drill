import type { VocabEntry } from '../types';
import { clearAllCachedAudio, removeCachedAudio } from './audioCache';
import { isManualTranslation, removeCachedTranslation, translateToSpanish } from './translate';
import { mapWithConcurrency } from './requestQueue';

export interface RegenerateProgress {
  done: number;
  total: number;
  phase: 'translate' | 'audio';
  current?: string;
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
): Promise<string | null> {
  if (options?.skipManual !== false && isManualTranslation(word)) {
    if (options?.refreshAudio !== false) await removeCachedAudio(word);
    return null;
  }

  removeCachedTranslation(word);
  if (options?.refreshAudio !== false) await removeCachedAudio(word);

  try {
    return await translateToSpanish(word, { force: true });
  } catch {
    return null;
  }
}

export async function regenerateVocabularyAssets(
  entries: VocabEntry[],
  prefetchSpeech: (words: string[]) => Promise<number>,
  options?: {
    skipManual?: boolean;
    prefetchAudio?: boolean;
    onProgress?: (progress: RegenerateProgress) => void;
  },
): Promise<RegenerateResult> {
  const skipManual = options?.skipManual ?? true;
  const words = entries.map((entry) => entry.word);
  const translations: Record<string, string> = {};
  let translated = 0;
  let skippedManual = 0;
  let failed = 0;
  let done = 0;

  await mapWithConcurrency(words, 1, async (word) => {
    if (skipManual && isManualTranslation(word)) {
      skippedManual += 1;
      await removeCachedAudio(word);
    } else {
      removeCachedTranslation(word);
      await removeCachedAudio(word);

      try {
        const result = await translateToSpanish(word, { force: true });
        translations[word] = result;
        translated += 1;
      } catch {
        failed += 1;
      }
    }

    done += 1;
    options?.onProgress?.({
      done,
      total: words.length,
      phase: 'translate',
      current: word,
    });
  });

  let audioCount = 0;

  if (options?.prefetchAudio !== false) {
    options?.onProgress?.({ done: 0, total: words.length, phase: 'audio' });
    await clearAllCachedAudio();
    audioCount = await prefetchSpeech(words);
  }

  return { translations, translated, skippedManual, audioCount, failed };
}
