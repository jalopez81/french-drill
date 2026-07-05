import { describe, expect, it, beforeAll } from 'vitest';
import type { SavedText, VocabEntry } from '../types';
import { loadCourseData } from './course';
import { findFlashcardContext } from './flashcardContext';

describe('findFlashcardContext', () => {
  beforeAll(async () => {
    await loadCourseData();
  });

  it('finds a course sentence containing the word', () => {
    const entry: VocabEntry = {
      id: '1',
      word: 'école',
      normalized: 'ecole',
      translation: 'escuela',
      addedAt: 1,
      kind: 'word',
    };

    const context = findFlashcardContext(entry, []);
    expect(context).not.toBeNull();
    expect(context?.targetNormalized).toBe('ecole');
    expect(context?.sentence.toLowerCase()).toMatch(/école|ecole/);
  });

  it('finds a sentence from saved lesson text', () => {
    const saved: SavedText = {
      id: 'lesson-1',
      title: 'Test',
      content: "Je vais à l'école demain.",
      sentences: ["Je vais à l'école demain."],
      createdAt: 1,
    };

    const entry: VocabEntry = {
      id: '2',
      word: 'école',
      normalized: 'ecole',
      translation: 'escuela',
      addedAt: 1,
      kind: 'word',
      sourceTextId: 'lesson-1',
    };

    const context = findFlashcardContext(entry, [saved]);
    expect(context?.sentence).toBe("Je vais à l'école demain.");
  });

  it('returns null for full sentence cards', () => {
    const entry: VocabEntry = {
      id: '3',
      word: "Je vais à l'école.",
      normalized: "je vais a l'ecole.",
      translation: 'Voy a la escuela.',
      addedAt: 1,
      kind: 'sentence',
    };

    expect(findFlashcardContext(entry, [])).toBeNull();
  });
});
