import courseData from '../../course.json';
import vocabData from '../../french_vocab.json';
import type { CourseUnit, VocabEntry } from '../types';
import { normalizeWord } from './wordExtractor';

export const courseUnits = (courseData as any).units as CourseUnit[];
export const vocabList = vocabData as Array<{
  id: number;
  word: string;
  translation: string;
  category: string;
  level: string;
}>;

const vocabMap = new Map(vocabList.map((w) => [w.id, w]));

export function getVocabWordById(id: number) {
  return vocabMap.get(id);
}

export function getUnitUniqueWordIds(unit: CourseUnit): number[] {
  const ids = new Set<number>();
  unit.sentences.forEach((s) => {
    s.wordIds.forEach((id) => ids.add(id));
  });
  return Array.from(ids);
}

export function calculateUnitProgress(unit: CourseUnit, vocabulary: VocabEntry[]): number {
  const targetIds = getUnitUniqueWordIds(unit);
  if (targetIds.length === 0) return 100;

  const vocabWords = targetIds.map((id) => getVocabWordById(id)).filter(Boolean) as Array<{ word: string }>;
  const userVocabMap = new Map(vocabulary.map((v) => [v.normalized, v]));

  let practiced = 0;
  vocabWords.forEach((vw) => {
    const normalized = normalizeWord(vw.word);
    const entry = userVocabMap.get(normalized);
    if (entry && entry.srs && entry.srs.repetitions > 0) {
      practiced++;
    }
  });

  return Math.round((practiced / targetIds.length) * 100);
}
