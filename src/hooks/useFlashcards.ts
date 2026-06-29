import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FlashcardRating, VocabEntry } from '../types';
import { countDue, isDue, sortByReviewPriority } from '../utils/spacedRepetition';

export function useFlashcards(vocabulary: VocabEntry[]) {
  const [queue, setQueue] = useState<VocabEntry[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);

  const studyDeck = useMemo(
    () => vocabulary.filter((entry) => entry.translation),
    [vocabulary],
  );

  const deckKey = useMemo(
    () => studyDeck.map((entry) => `${entry.id}:${entry.translation ?? ''}`).join('|'),
    [studyDeck],
  );

  const dueCount = useMemo(() => countDue(studyDeck), [studyDeck]);
  const totalCount = studyDeck.length;

  const currentCard = queue[0] ?? null;

  const rebuildQueue = useCallback(
    (mode: 'due' | 'all' = 'due') => {
      const cards = mode === 'all' ? studyDeck : studyDeck.filter((entry) => isDue(entry));
      setQueue(sortByReviewPriority(cards));
      setRevealed(false);
      if (mode === 'due') setSessionDone(0);
    },
    [studyDeck],
  );

  useEffect(() => {
    const cards = studyDeck.filter((entry) => isDue(entry));
    setQueue(sortByReviewPriority(cards));
    setRevealed(false);
    setSessionDone(0);
  }, [deckKey, studyDeck]);

  const rateCard = useCallback(
    (rating: FlashcardRating, onRate: (id: string, rating: FlashcardRating) => void) => {
      if (!currentCard) return;

      onRate(currentCard.id, rating);
      setSessionDone((count) => count + 1);
      setRevealed(false);
      setQueue((prev) => prev.slice(1));
    },
    [currentCard],
  );

  return {
    currentCard,
    revealed,
    setRevealed,
    rateCard,
    dueCount,
    totalCount,
    sessionDone,
    remainingInSession: queue.length,
    rebuildQueue,
    hasDeck: totalCount > 0,
    sessionComplete: totalCount > 0 && queue.length === 0 && sessionDone > 0,
  };
}
