import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlashcardRating, SavedText, VocabEntry } from '../types';
import type { FlashcardSessionFilter } from '../types';
import {
  countDue,
  getFlashcardCategory,
  isDue,
  sortByReviewPriority,
} from '../utils/spacedRepetition';
import { normalizeWord, uniqueWords } from '../utils/wordExtractor';

const RECENT_LIMIT = 3;

function rotateQueue(queue: VocabEntry[], recentIds: string[]): VocabEntry[] {
  if (queue.length <= 1) return queue;
  const recent = new Set(recentIds);
  if (!recent.has(queue[0].id)) return queue;
  const alt = queue.findIndex((entry) => !recent.has(entry.id));
  if (alt <= 0) return queue;
  const next = [...queue];
  const [item] = next.splice(alt, 1);
  next.unshift(item);
  return next;
}

function filterDeck(
  deck: VocabEntry[],
  filter: FlashcardSessionFilter | null,
  savedTexts: SavedText[],
): VocabEntry[] {
  if (!filter) return deck;

  let result = deck;

  if (filter.textId) {
    const text = savedTexts.find((item) => item.id === filter.textId);
    if (text) {
      const words = new Set(uniqueWords(text.content).map(normalizeWord));
      result = result.filter((entry) => words.has(entry.normalized));
    } else {
      result = [];
    }
  }

  if (filter.category) {
    result = result.filter((entry) => getFlashcardCategory(entry) === filter.category);
  }

  return result;
}

export function useFlashcards(
  vocabulary: VocabEntry[],
  savedTexts: SavedText[],
  sessionFilter: FlashcardSessionFilter | null = null,
) {
  const [queue, setQueue] = useState<VocabEntry[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);
  const recentIdsRef = useRef<string[]>([]);
  const [queueMode, setQueueMode] = useState<'due' | 'all'>('due');

  const studyDeck = useMemo(
    () => vocabulary.filter((entry) => entry.translation),
    [vocabulary],
  );

  const filteredDeck = useMemo(
    () => filterDeck(studyDeck, sessionFilter, savedTexts),
    [studyDeck, sessionFilter, savedTexts],
  );

  const filterKey = useMemo(
    () => `${sessionFilter?.textId ?? ''}:${sessionFilter?.category ?? ''}`,
    [sessionFilter],
  );

  const deckKey = useMemo(() => filteredDeck.map((entry) => entry.id).join('|'), [filteredDeck]);

  const dueCount = useMemo(() => countDue(filteredDeck), [filteredDeck]);
  const totalCount = filteredDeck.length;

  const currentCard = queue[0] ?? null;

  const rebuildQueue = useCallback(
    (mode: 'due' | 'all' = 'due') => {
      const cards =
        mode === 'all' ? filteredDeck : filteredDeck.filter((entry) => isDue(entry));
      setQueue(sortByReviewPriority(cards));
      setRevealed(false);
      recentIdsRef.current = [];
      setQueueMode(mode);
      if (mode === 'due') setSessionDone(0);
    },
    [filteredDeck],
  );

  useEffect(() => {
    const cards = filteredDeck.filter((entry) => isDue(entry));
    setQueue(sortByReviewPriority(cards));
    setRevealed(false);
    setSessionDone(0);
    recentIdsRef.current = [];
    setQueueMode('due');
  }, [deckKey, filterKey, filteredDeck]);

  const rateCard = useCallback(
    (rating: FlashcardRating, onRate: (id: string, rating: FlashcardRating) => void) => {
      if (!currentCard) return;

      onRate(currentCard.id, rating);
      setSessionDone((count) => count + 1);
      setRevealed(false);

      const nextRecent = [currentCard.id, ...recentIdsRef.current].slice(0, RECENT_LIMIT);
      recentIdsRef.current = nextRecent;

      setQueue((prevQueue) => {
        const rest = prevQueue.slice(1);
        const nextRest =
          rating === 'again' && queueMode === 'all' ? [...rest, currentCard] : rest;
        return rotateQueue(nextRest, nextRecent);
      });
    },
    [currentCard, queueMode],
  );

  const startCategorySession = useCallback(
    (category: FlashcardSessionFilter['category']) => {
      const cards = filteredDeck.filter((entry) => getFlashcardCategory(entry) === category);
      setQueue(sortByReviewPriority(cards));
      setRevealed(false);
      recentIdsRef.current = [];
      setQueueMode('all');
      setSessionDone(0);
    },
    [filteredDeck],
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
    startCategorySession,
    hasDeck: totalCount > 0,
    sessionComplete: totalCount > 0 && queue.length === 0 && sessionDone > 0,
    sessionFilter,
  };
}
