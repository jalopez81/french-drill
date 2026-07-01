import type { VocabEntry } from '../types';
import type { FlashcardCategory } from './spacedRepetition';
import { getFlashcardCategory } from './spacedRepetition';
import { normalizeWord } from './wordExtractor';
import { tokenizeSentence } from './tokenize';

export interface DrillWordOccurrence {
  sentenceIndex: number;
  tokenIndex: number;
  word: string;
  normalized: string;
}

const CATEGORY_WEIGHT: Record<FlashcardCategory, number> = {
  again: 5,
  hard: 4,
  new: 3,
  good: 1,
  easy: 0.3,
};

function buildOccurrences(sentences: string[]): DrillWordOccurrence[] {
  const occurrences: DrillWordOccurrence[] = [];

  sentences.forEach((sentence, sentenceIndex) => {
    tokenizeSentence(sentence).forEach((token, tokenIndex) => {
      if (token.kind === 'word') {
        occurrences.push({
          sentenceIndex,
          tokenIndex,
          word: token.text,
          normalized: normalizeWord(token.text),
        });
      }
    });
  });

  return occurrences;
}

function categoryForWord(normalized: string, vocabulary: VocabEntry[], now: number): FlashcardCategory {
  const entry = vocabulary.find((item) => item.normalized === normalized);
  if (!entry) return 'new';
  return getFlashcardCategory(entry, now);
}

export function pickWeightedDrillOccurrence(
  sentences: string[],
  vocabulary: VocabEntry[],
  lastNormalized: string | null = null,
  now = Date.now(),
): DrillWordOccurrence | null {
  const occurrences = buildOccurrences(sentences);
  if (occurrences.length === 0) return null;

  let pool = occurrences;
  if (lastNormalized && occurrences.length > 1) {
    const withoutLast = occurrences.filter((item) => item.normalized !== lastNormalized);
    if (withoutLast.length > 0) pool = withoutLast;
  }

  const weights = pool.map((item) => {
    const category = categoryForWord(item.normalized, vocabulary, now);
    return CATEGORY_WEIGHT[category];
  });

  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;

  for (let index = 0; index < pool.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return pool[index];
  }

  return pool[pool.length - 1];
}
