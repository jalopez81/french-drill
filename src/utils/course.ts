import type { CourseSentence, CourseTense, CourseUnit, VocabEntry } from '../types';
import { getFlashcardCategory } from './spacedRepetition';
import { cacheTranslation, persistTranslationCache } from './translate';
import { normalizeWord } from './wordExtractor';

function isUnitWordEngaged(entry: VocabEntry, now: number): boolean {
  if (entry.srs?.lastReview) return true;
  if ((entry.srs?.repetitions ?? 0) > 0) return true;
  return getFlashcardCategory(entry, now) !== 'new';
}

export interface LexiconWord {
  id: number;
  word: string;
  translation: string;
  category: string;
  level: string;
  frequency_ranking?: number;
  tags?: string[];
}

interface CourseFile {
  version: number;
  units: CourseUnit[];
}

let courseUnits: CourseUnit[] = [];
let vocabList: LexiconWord[] = [];
let vocabMap = new Map<number, LexiconWord>();
let lexiconNormalized = new Set<string>();
let lexiconByNormalized = new Map<string, LexiconWord>();
let loadPromise: Promise<void> | null = null;

const LEVEL_RANK: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4 };

/** Word considered mastered for unit progress (≥ ~80% weight). */
const MASTERED_CATEGORIES = new Set(['good', 'easy']);

export function isCourseLoaded(): boolean {
  return vocabList.length > 0;
}

export function loadCourseData(): Promise<void> {
  if (isCourseLoaded()) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = Promise.all([
      import('../../course.json'),
      import('../../french_vocab.json'),
    ]).then(([courseMod, vocabMod]) => {
      courseUnits = (courseMod.default as CourseFile).units;
      vocabList = vocabMod.default as LexiconWord[];
      vocabMap = new Map(vocabList.map((w) => [w.id, w]));
      lexiconNormalized = new Set(vocabList.map((w) => normalizeWord(w.word)));
      lexiconByNormalized = new Map(vocabList.map((w) => [normalizeWord(w.word), w]));
    });
  }
  return loadPromise;
}

export function getCourseUnits(): CourseUnit[] {
  return courseUnits;
}

export function getVocabList(): LexiconWord[] {
  return vocabList;
}

export function isLexiconWord(word: string): boolean {
  return lexiconNormalized.has(normalizeWord(word));
}

export function isCourseLessonId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith('course-'));
}

export function isLexiconPlaceholderId(id: string): boolean {
  return id.startsWith('lexicon-');
}

export function getVocabWordById(id: number): LexiconWord | undefined {
  return vocabMap.get(id);
}

export function getUnitUniqueWordIds(unit: CourseUnit): number[] {
  const ids = new Set<number>();
  unit.sentences.forEach((s) => {
    s.wordIds.forEach((id) => ids.add(id));
  });
  return Array.from(ids);
}

export const COURSE_TENSES: CourseTense[] = ['present', 'past', 'future'];

export const COURSE_TENSE_LABELS: Record<CourseTense, string> = {
  present: 'Presente',
  past: 'Pasado',
  future: 'Futuro',
};

export function getSentenceVariant(
  sentence: CourseSentence,
  tense: CourseTense,
): { text: string; translation: string } {
  switch (tense) {
    case 'past':
      return {
        text: sentence.text_past?.trim() || sentence.text,
        translation: sentence.translation_past?.trim() || sentence.translation,
      };
    case 'future':
      return {
        text: sentence.text_future?.trim() || sentence.text,
        translation: sentence.translation_future?.trim() || sentence.translation,
      };
    default:
      return { text: sentence.text, translation: sentence.translation };
  }
}

export function buildUnitLessonContent(
  sentences: CourseSentence[],
  tense: CourseTense,
): { content: string; sentences: string[]; cacheKeys: string[] } {
  const variants = sentences.map((s) => getSentenceVariant(s, tense));
  const texts = variants.map((v) => v.text);
  const cacheKeys = variants.flatMap((v) => [v.text, v.translation]);
  return { content: texts.join('\n'), sentences: texts, cacheKeys };
}

export function buildUnitSearchText(unit: CourseUnit): string {
  const parts = [unit.title, unit.id];
  for (const sentence of unit.sentences) {
    parts.push(
      sentence.text,
      sentence.translation,
      sentence.text_past ?? '',
      sentence.text_future ?? '',
      sentence.translation_past ?? '',
      sentence.translation_future ?? '',
    );
  }
  return parts.join(' ').toLowerCase();
}

export function unitMatchesSearch(unit: CourseUnit, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return buildUnitSearchText(unit).includes(q);
}

export function cacheUnitTranslations(unit: CourseUnit): void {
  for (const sentence of unit.sentences) {
    for (const tense of COURSE_TENSES) {
      const { text, translation } = getSentenceVariant(sentence, tense);
      if (text.trim() && translation.trim()) {
        cacheTranslation(text.trim(), translation.trim());
      }
    }
    for (const id of sentence.wordIds) {
      const word = getVocabWordById(id);
      if (word) {
        cacheTranslation(word.word, word.translation);
      }
    }
  }
  persistTranslationCache();
}

export function getLexiconLevelForWord(word: string): string | undefined {
  return lexiconByNormalized.get(normalizeWord(word))?.level;
}

export const LEXICON_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
export type LexiconLevel = (typeof LEXICON_LEVELS)[number];

export function getUnitBatchWordIds(unit: CourseUnit): number[] {
  const startId = 31 + (unit.order - 1) * 20;
  const endId = Math.min(startId + 19, 2000);
  return Array.from({ length: endId - startId + 1 }, (_, i) => startId + i);
}

/** CEFR level derived from the lexicon batch for this unit (not the static JSON field). */
export function getUnitDisplayLevel(unit: CourseUnit): string {
  const counts: Record<string, number> = {};
  for (const id of getUnitBatchWordIds(unit)) {
    const lex = getVocabWordById(id);
    if (lex) counts[lex.level] = (counts[lex.level] ?? 0) + 1;
  }
  const ranked = Object.entries(counts).sort(
    (a, b) => b[1] - a[1] || (LEVEL_RANK[b[0]] ?? 0) - (LEVEL_RANK[a[0]] ?? 0),
  );
  return ranked[0]?.[0] ?? unit.level;
}

export function hasStartedUnit(
  unit: CourseUnit,
  vocabulary: VocabEntry[],
  openedUnits?: Set<string>,
): boolean {
  if (openedUnits?.has(unit.id)) return true;
  const userNorms = new Set(vocabulary.map((v) => v.normalized));
  for (const id of getUnitUniqueWordIds(unit)) {
    const lex = getVocabWordById(id);
    if (lex && userNorms.has(normalizeWord(lex.word))) {
      const entry = vocabulary.find((v) => v.normalized === normalizeWord(lex.word));
      if (entry && isUnitWordEngaged(entry, Date.now())) return true;
    }
  }
  return false;
}

/** Share of unit words rated at least once in SRS (not merely seeded). */
export function calculateUnitStudyProgress(
  unit: CourseUnit,
  vocabulary: VocabEntry[],
  now = Date.now(),
): number {
  const targetIds = getUnitUniqueWordIds(unit);
  if (targetIds.length === 0) return 0;

  const userVocabMap = new Map(vocabulary.map((v) => [v.normalized, v]));
  let engaged = 0;
  for (const id of targetIds) {
    const lex = getVocabWordById(id);
    if (!lex) continue;
    const entry = userVocabMap.get(normalizeWord(lex.word));
    if (entry && isUnitWordEngaged(entry, now)) engaged += 1;
  }
  return Math.round((engaged / targetIds.length) * 100);
}

export function calculateUnitProgress(unit: CourseUnit, vocabulary: VocabEntry[], now = Date.now()): number {
  const targetIds = getUnitUniqueWordIds(unit);
  if (targetIds.length === 0) return 100;

  const userVocabMap = new Map(vocabulary.map((v) => [v.normalized, v]));

  let mastered = 0;
  for (const id of targetIds) {
    const lex = getVocabWordById(id);
    if (!lex) continue;
    const entry = userVocabMap.get(normalizeWord(lex.word));
    if (!entry) continue;
    const category = getFlashcardCategory(entry, now);
    if (MASTERED_CATEGORIES.has(category)) {
      mastered += 1;
    }
  }

  return Math.round((mastered / targetIds.length) * 100);
}

/** Full lexicon merged with user SRS entries (for Vocabulario tab). */
export function mergeLexiconWithUserVocab(vocabulary: VocabEntry[]): VocabEntry[] {
  const userByNormalized = new Map(vocabulary.map((entry) => [entry.normalized, entry]));

  return vocabList.map((lex) => {
    const normalized = normalizeWord(lex.word);
    const existing = userByNormalized.get(normalized);
    if (existing) return { ...existing, lexiconLevel: lex.level };

    return {
      id: `lexicon-${lex.id}`,
      word: lex.word,
      normalized,
      translation: lex.translation,
      addedAt: 0,
      kind: 'word' as const,
      lexiconLevel: lex.level,
    };
  });
}

export function findCourseUnitById(unitId: string): CourseUnit | undefined {
  return courseUnits.find((unit) => unit.id === unitId);
}

export function getUnitVocabNormalized(unit: CourseUnit): Set<string> {
  const normalized = new Set<string>();
  for (const id of getUnitUniqueWordIds(unit)) {
    const lex = getVocabWordById(id);
    if (lex) normalized.add(normalizeWord(lex.word));
  }
  return normalized;
}
