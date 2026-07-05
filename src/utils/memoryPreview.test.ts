import { describe, expect, it } from 'vitest';
import {
  filterNewMemoryCandidates,
  memoryItemKey,
  previewLessonMemoryItems,
  previewSyncMemoryItems,
} from './memoryPreview';

describe('memoryPreview', () => {
  it('builds stable keys per kind', () => {
    expect(memoryItemKey('word', 'bonjour')).toBe('word:bonjour');
    expect(memoryItemKey('sentence', 'bonjour mon ami')).toBe('sentence:bonjour mon ami');
  });

  it('marks existing vocabulary as alreadyInMemory', () => {
    const candidates = previewLessonMemoryItems(
      [{ id: '1', word: 'Bonjour', normalized: 'bonjour', addedAt: 1, translation: 'Hola' }],
      'Bonjour tout le monde.',
      [],
      [{ phrase: 'tout le monde', translation: 'todo el mundo' }],
    );

    expect(candidates.find((item) => item.normalized === 'bonjour')?.alreadyInMemory).toBe(true);
    expect(candidates.find((item) => item.kind === 'capsule')?.alreadyInMemory).toBe(false);
  });

  it('previewSyncMemoryItems excludes words', () => {
    const items = previewSyncMemoryItems([], [], [{ phrase: 'bonjour', translation: 'hola' }]);
    expect(items.every((item) => item.kind !== 'word')).toBe(true);
    expect(items[0]?.kind).toBe('capsule');
  });

  it('filterNewMemoryCandidates keeps only new items', () => {
    const candidates = [
      {
        key: 'word:a',
        kind: 'word' as const,
        word: 'a',
        normalized: 'a',
        alreadyInMemory: true,
      },
      {
        key: 'word:b',
        kind: 'word' as const,
        word: 'b',
        normalized: 'b',
        alreadyInMemory: false,
      },
    ];
    expect(filterNewMemoryCandidates(candidates)).toHaveLength(1);
    expect(filterNewMemoryCandidates(candidates)[0]?.normalized).toBe('b');
  });
});
