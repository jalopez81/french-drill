import type { SavedText, VocabEntry } from '../types';
import type { FlashcardCategory, FlashcardCategorySummary } from '../utils/spacedRepetition';
import { getFlashcardCategory } from '../utils/spacedRepetition';
import { normalizeWord, uniqueWords } from './wordExtractor';

const MASTERY_WEIGHT: Record<FlashcardCategory, number> = {
  new: 0,
  again: 20,
  hard: 45,
  good: 75,
  easy: 100,
};

export function summarizeWordsInText(
  text: SavedText,
  vocabulary: VocabEntry[],
  now = Date.now(),
): FlashcardCategorySummary {
  const words = uniqueWords(text.content);
  const byNormalized = new Map(vocabulary.map((entry) => [entry.normalized, entry]));

  const summary: FlashcardCategorySummary = {
    new: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  };

  for (const word of words) {
    const entry = byNormalized.get(normalizeWord(word));
    if (!entry) {
      summary.new += 1;
      continue;
    }
    summary[getFlashcardCategory(entry, now)] += 1;
  }

  return summary;
}

export function calculateTextMasteryPercent(summary: FlashcardCategorySummary): number {
  const total = Object.values(summary).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;

  const weighted = (Object.keys(MASTERY_WEIGHT) as FlashcardCategory[]).reduce(
    (sum, category) => sum + summary[category] * MASTERY_WEIGHT[category],
    0,
  );

  return Math.round(weighted / total);
}
