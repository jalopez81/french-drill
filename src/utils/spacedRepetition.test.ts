import { describe, expect, it } from 'vitest';
import {
  countDue,
  createInitialSrs,
  getFlashcardCategory,
  isDue,
  summarizeFlashcardDeck,
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
});
