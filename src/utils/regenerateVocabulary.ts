import type { VocabEntry } from '../types';
import { clearAllCachedAudio, removeCachedAudio } from './audioCache';
import { isManualTranslation, removeCachedTranslation, translateToSpanish } from './translate';

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

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) return;
      await worker(item);
    }
  });
  await Promise.all(runners);
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

  await mapWithConcurrency(words, 2, async (word) => {
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

  options?.onProgress?.({ done: 0, total: words.length, phase: 'audio' });
  await clearAllCachedAudio();
  const audioCount = await prefetchSpeech(words);

  return { translations, translated, skippedManual, audioCount, failed };
}
