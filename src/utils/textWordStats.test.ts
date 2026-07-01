import { describe, expect, it } from 'vitest';
import { calculateTextMasteryPercent, summarizeWordsInText } from './textWordStats';
import type { SavedText, VocabEntry } from '../types';

const NOW = Date.UTC(2026, 5, 30, 12, 0, 0);

const text: SavedText = {
  id: 't1',
  title: 'Test',
  content: 'Bonjour le monde',
  sentences: ['Bonjour le monde'],
  createdAt: NOW,
};

describe('textWordStats', () => {
  it('counts unknown words as new', () => {
    const summary = summarizeWordsInText(text, [], NOW);
    expect(summary.new).toBe(3);
    expect(calculateTextMasteryPercent(summary)).toBe(0);
  });

  it('weights mastered words toward 100 percent mastery', () => {
    const vocabulary: VocabEntry[] = [
      {
        id: '1',
        word: 'Bonjour',
        normalized: 'bonjour',
        translation: 'hola',
        addedAt: NOW,
        srs: {
          ease: 2.5,
          intervalDays: 30,
          repetitions: 5,
          nextReview: NOW + 30 * 24 * 60 * 60 * 1000,
        },
      },
      {
        id: '2',
        word: 'le',
        normalized: 'le',
        translation: 'el',
        addedAt: NOW,
        srs: {
          ease: 2.5,
          intervalDays: 30,
          repetitions: 5,
          nextReview: NOW + 30 * 24 * 60 * 60 * 1000,
        },
      },
      {
        id: '3',
        word: 'monde',
        normalized: 'monde',
        translation: 'mundo',
        addedAt: NOW,
        srs: {
          ease: 2.5,
          intervalDays: 30,
          repetitions: 5,
          nextReview: NOW + 30 * 24 * 60 * 60 * 1000,
        },
      },
    ];

    const summary = summarizeWordsInText(text, vocabulary, NOW);
    expect(summary.easy).toBe(3);
    expect(calculateTextMasteryPercent(summary)).toBe(100);
  });
});
