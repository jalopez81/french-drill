import { describe, expect, it, beforeAll } from 'vitest';
import type { CourseUnit, VocabEntry } from '../types';
import {
  calculateUnitProgress,
  calculateUnitStudyProgress,
  hasStartedUnit,
  isCourseLessonId,
  loadCourseData,
  mergeLexiconWithUserVocab,
  getSentenceVariant,
  buildUnitLessonContent,
  unitMatchesSearch,
  buildUnitSearchText,
} from './course';

beforeAll(async () => {
  await loadCourseData();
});

const NOW = Date.UTC(2026, 6, 4, 12, 0, 0);

function entry(word: string, srs?: VocabEntry['srs']): VocabEntry {
  return {
    id: word,
    word,
    normalized: word.toLowerCase(),
    translation: 'x',
    addedAt: NOW,
    srs,
  };
}

const sampleUnit: CourseUnit = {
  id: 'a1-u01',
  title: 'Test',
  level: 'A1',
  order: 1,
  sentences: [
    { id: 's1', text: 'a', translation: 'b', wordIds: [31, 32] },
    { id: 's2', text: 'c', translation: 'd', wordIds: [33] },
  ],
};

describe('course', () => {
  it('detects course lesson ids', () => {
    expect(isCourseLessonId('course-a1-u01')).toBe(true);
    expect(isCourseLessonId('abc')).toBe(false);
  });

  it('calculates unit progress from mastered SRS categories', () => {
    const masteredSrs = {
      ease: 2.5,
      intervalDays: 14,
      repetitions: 4,
      nextReview: NOW + 30 * 86400000,
    };
    const vocabulary = [
      entry('mais', masteredSrs),
      entry('leur', masteredSrs),
      entry('comme', masteredSrs),
    ];
    expect(calculateUnitProgress(sampleUnit, vocabulary, NOW)).toBe(100);
  });

  it('merges lexicon with user vocabulary', () => {
    const merged = mergeLexiconWithUserVocab([entry('mais')]);
    expect(merged.length).toBeGreaterThan(1000);
    expect(merged.some((item) => item.word === 'mais' && item.id === 'mais')).toBe(true);
    expect(merged.some((item) => item.id.startsWith('lexicon-'))).toBe(true);
    expect(merged.find((item) => item.word === 'mais')?.lexiconLevel).toBeTruthy();
  });

  it('tracks started units and study progress from user vocabulary', () => {
    const vocabulary = [
      entry('mais'),
      entry('leur'),
      entry('comme'),
    ];
    expect(hasStartedUnit(sampleUnit, vocabulary, new Set(['a1-u01']))).toBe(true);
    expect(calculateUnitStudyProgress(sampleUnit, vocabulary, NOW)).toBe(0);
    const reviewed = [
      {
        ...entry('mais'),
        srs: {
          ease: 2.5,
          intervalDays: 1,
          repetitions: 1,
          nextReview: NOW + 86400000,
          lastReview: NOW,
        },
      },
      entry('leur'),
      entry('comme'),
    ];
    expect(calculateUnitStudyProgress(sampleUnit, reviewed, NOW)).toBe(33);
    expect(calculateUnitProgress(sampleUnit, reviewed, NOW)).toBe(0);
  });

  it('resolves sentence variants by tense with present fallback', () => {
    const sentence = {
      id: 's1',
      text: 'Je mange.',
      translation: 'Como.',
      wordIds: [31],
      text_past: "J'ai mangé.",
      translation_past: 'Comí.',
      text_future: 'Je mangerai.',
      translation_future: 'Comeré.',
    };
    expect(getSentenceVariant(sentence, 'present')).toEqual({ text: 'Je mange.', translation: 'Como.' });
    expect(getSentenceVariant(sentence, 'past')).toEqual({ text: "J'ai mangé.", translation: 'Comí.' });
    expect(getSentenceVariant(sentence, 'future')).toEqual({ text: 'Je mangerai.', translation: 'Comeré.' });
    expect(getSentenceVariant({ ...sentence, text_past: undefined }, 'past').text).toBe('Je mange.');
  });

  it('builds unit lesson content for a tense', () => {
    const sentences = [
      {
        id: 's1',
        text: 'A',
        translation: 'a',
        wordIds: [31],
        text_past: 'B',
        translation_past: 'b',
      },
      {
        id: 's2',
        text: 'C',
        translation: 'c',
        wordIds: [32],
      },
    ];
    const past = buildUnitLessonContent(sentences, 'past');
    expect(past.content).toBe('B\nC');
    expect(past.sentences).toEqual(['B', 'C']);
    expect(past.cacheKeys).toEqual(['B', 'b', 'C', 'c']);
  });

  it('matches units by sentence content in search', () => {
    const unit: CourseUnit = {
      id: 'a1-u99',
      title: 'Acciones finales',
      level: 'A1',
      order: 99,
      sentences: [
        {
          id: 's1',
          text: 'Paul veut partir demain.',
          translation: 'Paul quiere irse mañana.',
          wordIds: [31],
          text_past: 'Paul a voulu partir hier.',
          translation_past: 'Paul quiso irse ayer.',
        },
      ],
    };
    expect(unitMatchesSearch(unit, 'demain')).toBe(true);
    expect(unitMatchesSearch(unit, 'quiso irse')).toBe(true);
    expect(unitMatchesSearch(unit, 'a voulu')).toBe(true);
    expect(unitMatchesSearch(unit, 'xyznotfound')).toBe(false);
    expect(buildUnitSearchText(unit)).toContain('demain');
  });
});
