import { describe, expect, it } from 'vitest';
import { extractWords, normalizeWord, uniqueWords } from './wordExtractor';

describe('wordExtractor', () => {
  it('extracts words with accents and apostrophes', () => {
    expect(extractWords("l'été est chaud")).toEqual(["l'été", 'est', 'chaud']);
  });

  it('normalizes accents and case', () => {
    expect(normalizeWord('Été')).toBe('ete');
  });

  it('returns unique words preserving first casing', () => {
    expect(uniqueWords('Bonjour bonjour monde')).toEqual(['Bonjour', 'monde']);
  });
});
