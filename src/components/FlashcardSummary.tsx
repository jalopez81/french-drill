import { useMemo } from 'react';
import type { VocabEntry } from '../types';
import type { FlashcardCategory } from '../types';
import { summarizeFlashcardDeck } from '../utils/spacedRepetition';
import { WordCategorySummary } from './WordCategorySummary';

interface FlashcardSummaryProps {
  vocabulary: VocabEntry[];
  onCategoryClick?: (category: FlashcardCategory) => void;
}

export function FlashcardSummary({ vocabulary, onCategoryClick }: FlashcardSummaryProps) {
  const summary = useMemo(() => summarizeFlashcardDeck(vocabulary), [vocabulary]);
  const total = useMemo(() => Object.values(summary).reduce((sum, count) => sum + count, 0), [summary]);

  if (total === 0) return null;

  return (
    <WordCategorySummary summary={summary} variant="grid" onCategoryClick={onCategoryClick} />
  );
}
