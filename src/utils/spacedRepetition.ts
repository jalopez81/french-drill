import type { FlashcardRating, VocabEntry, VocabSrs } from '../types';

export type FlashcardCategory = 'new' | 'again' | 'hard' | 'good' | 'easy';

export type FlashcardCategorySummary = Record<FlashcardCategory, number>;

const DAY_MS = 24 * 60 * 60 * 1000;

const RATING_QUALITY: Record<FlashcardRating, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export function createInitialSrs(now = Date.now()): VocabSrs {
  return {
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    nextReview: now,
  };
}

export function isDue(entry: { srs?: VocabSrs }, now = Date.now()): boolean {
  if (!entry.srs) return true;
  return entry.srs.nextReview <= now;
}

export function updateSrs(current: VocabSrs | undefined, rating: FlashcardRating, now = Date.now()): VocabSrs {
  const quality = RATING_QUALITY[rating];
  const base = current ?? createInitialSrs(now);

  let ease = base.ease;
  let intervalDays = base.intervalDays;
  let repetitions = base.repetitions;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(intervalDays * ease));

    repetitions += 1;
  }

  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < 1.3) ease = 1.3;

  if (rating === 'again') {
    intervalDays = 0;
  } else if (rating === 'hard') {
    intervalDays = Math.max(1, Math.round(intervalDays * 0.75));
  } else if (rating === 'easy') {
    intervalDays = Math.round(intervalDays * 1.3) + 1;
  }

  const nextReview =
    intervalDays === 0 ? now + 10 * 60 * 1000 : now + intervalDays * DAY_MS;

  return {
    ease,
    intervalDays,
    repetitions,
    nextReview,
    lastReview: now,
  };
}

export function countDue<T extends { srs?: VocabSrs }>(entries: T[], now = Date.now()): number {
  return entries.filter((entry) => isDue(entry, now)).length;
}

export function sortByReviewPriority<T extends { srs?: VocabSrs }>(entries: T[], now = Date.now()): T[] {
  return [...entries].sort((a, b) => {
    const aDue = isDue(a, now);
    const bDue = isDue(b, now);
    if (aDue !== bDue) return aDue ? -1 : 1;

    const aNext = a.srs?.nextReview ?? 0;
    const bNext = b.srs?.nextReview ?? 0;
    return aNext - bNext;
  });
}

export function shuffleDeck<T>(entries: T[]): T[] {
  const result = [...entries];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function formatNextReview(nextReview: number, now = Date.now()): string {
  const diff = nextReview - now;
  if (diff <= 0) return 'Ahora';

  const minutes = Math.round(diff / (60 * 1000));
  if (minutes < 60) return `En ${minutes} min`;

  const hours = Math.round(diff / (60 * 60 * 1000));
  if (hours < 24) return `En ${hours} h`;

  const days = Math.round(diff / DAY_MS);
  if (days === 1) return 'Mañana';
  return `En ${days} días`;
}

export function getFlashcardCategory(entry: VocabEntry, now = Date.now()): FlashcardCategory {
  if (!entry.srs) return 'new';
  if (isDue(entry, now)) return 'again';
  if (entry.srs.repetitions <= 1 || entry.srs.intervalDays <= 1) return 'hard';
  if (entry.srs.intervalDays < 14) return 'good';
  return 'easy';
}

export function summarizeFlashcardDeck(entries: VocabEntry[], now = Date.now()): FlashcardCategorySummary {
  const summary: FlashcardCategorySummary = {
    new: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  };

  for (const entry of entries) {
    if (!entry.translation) continue;
    summary[getFlashcardCategory(entry, now)] += 1;
  }

  return summary;
}
