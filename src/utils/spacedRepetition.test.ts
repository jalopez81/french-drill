import { describe, expect, it } from 'vitest';
import {
  countDue,
  createInitialSrs,
  formatUpcomingReviewLine,
  getFlashcardCategory,
  isDue,
  summarizeFlashcardDeck,
  summarizeUpcomingReviews,
  shuffleDeck,
  updateSrs,
} from './spacedRepetition';
import type { VocabEntry } from '../types';

const NOW = Date.UTC(2026, 5, 30, 12, 0, 0);

function entry(overrides: Partial<VocabEntry> = {}): VocabEntry {
  return {
    id: '1',
    word: 'bonjour',
    normalized: 'bonjour',
    translation: 'hola',
    addedAt: NOW,
    ...overrides,
  };
}

describe('spacedRepetition', () => {
  it('marks cards without srs as due and new', () => {
    const card = entry();
    expect(isDue(card, NOW)).toBe(true);
    expect(getFlashcardCategory(card, NOW)).toBe('new');
  });

  it('schedules again reviews in the near future', () => {
    const srs = updateSrs(createInitialSrs(NOW), 'again', NOW);
    expect(srs.intervalDays).toBe(0);
    expect(srs.nextReview).toBeGreaterThan(NOW);
    expect(isDue({ srs }, NOW + 5 * 60 * 1000)).toBe(false);
  });

  it('increases interval after good rating', () => {
    const first = updateSrs(createInitialSrs(NOW), 'good', NOW);
    const second = updateSrs(first, 'good', NOW + 1);
    expect(second.repetitions).toBe(2);
    expect(second.intervalDays).toBeGreaterThanOrEqual(1);
  });

  it('counts due cards and summarizes deck categories', () => {
    const due = entry({ srs: { ease: 2.5, intervalDays: 1, repetitions: 1, nextReview: NOW - 1 } });
    const mastered = entry({
      id: '2',
      word: 'merci',
      normalized: 'merci',
      srs: {
        ease: 2.5,
        intervalDays: 30,
        repetitions: 5,
        nextReview: NOW + 30 * 24 * 60 * 60 * 1000,
      },
    });

    expect(countDue([due, mastered], NOW)).toBe(1);
    const summary = summarizeFlashcardDeck([due, mastered], NOW);
    expect(summary.again).toBe(1);
    expect(summary.easy).toBe(1);
  });

  it('shuffles deck order without dropping items', () => {
    const deck = [
      entry({ id: 'a', word: 'un' }),
      entry({ id: 'b', word: 'deux' }),
      entry({ id: 'c', word: 'trois' }),
    ];
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(3);
    expect(new Set(shuffled.map((item) => item.id))).toEqual(new Set(['a', 'b', 'c']));
  });

  it('groups upcoming reviews by interval', () => {
    const tenMin = NOW + 10 * 60 * 1000;
    const twoDays = NOW + 2 * 24 * 60 * 60 * 1000;
    const deck = [
      entry({
        id: 'a',
        srs: { ease: 2.5, intervalDays: 0, repetitions: 1, nextReview: tenMin, lastReview: NOW },
      }),
      entry({
        id: 'b',
        word: 'salut',
        normalized: 'salut',
        srs: { ease: 2.5, intervalDays: 0, repetitions: 1, nextReview: tenMin + 20_000, lastReview: NOW },
      }),
      entry({
        id: 'c',
        word: 'merci',
        normalized: 'merci',
        srs: { ease: 2.5, intervalDays: 2, repetitions: 2, nextReview: twoDays, lastReview: NOW },
      }),
    ];

    const groups = summarizeUpcomingReviews(deck, NOW);
    expect(groups).toHaveLength(6);
    expect(groups.find((g) => g.id === '10m')).toMatchObject({ count: 2, intervalLabel: '10 minutos' });
    expect(groups.find((g) => g.id === '2d')).toMatchObject({ count: 1, intervalLabel: '2 días' });
    expect(groups.find((g) => g.id === '1h')?.count).toBe(0);
    expect(formatUpcomingReviewLine(groups.find((g) => g.id === '10m')!)).toBe('2 palabras en 10 minutos');
    expect(formatUpcomingReviewLine(groups.find((g) => g.id === '1h')!)).toBe('0 palabras en 1 hora');
  });
});
