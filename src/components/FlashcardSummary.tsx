import { useMemo } from 'react';
import type { VocabEntry } from '../types';
import { summarizeFlashcardDeck } from '../utils/spacedRepetition';
import { WordCategorySummary } from './WordCategorySummary';

interface FlashcardSummaryProps {
  vocabulary: VocabEntry[];
}

export function FlashcardSummary({ vocabulary }: FlashcardSummaryProps) {
  const summary = useMemo(() => summarizeFlashcardDeck(vocabulary), [vocabulary]);
  const total = useMemo(() => Object.values(summary).reduce((sum, count) => sum + count, 0), [summary]);

  if (total === 0) return null;

  return <WordCategorySummary summary={summary} variant="grid" />;
}
