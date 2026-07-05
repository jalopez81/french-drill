import type { SavedText, VocabEntry } from '../types';
import {
  findCourseUnitById,
  getCourseUnits,
  getSentenceVariant,
  isCourseLessonId,
} from './course';
import { getVocabKind } from './vocabKind';
import { normalizeWord, normalizePhrase } from './wordExtractor';
import { tokenizeSentence } from './tokenize';

export interface FlashcardContext {
  sentence: string;
  targetNormalized: string;
}

export function tokenMatchesTarget(token: string, normalized: string): boolean {
  const tokenNorm = normalizeWord(token);
  if (tokenNorm === normalized) return true;
  const stripped = tokenNorm.replace(/^[a-z]'/, '');
  return stripped === normalized;
}

function sentenceContainsNormalizedWord(sentence: string, normalized: string): boolean {
  return tokenizeSentence(sentence).some(
    (token) => token.kind === 'word' && tokenMatchesTarget(token.text, normalized),
  );
}

function sentenceContainsPhrase(sentence: string, phraseNormalized: string): boolean {
  return normalizePhrase(sentence).includes(phraseNormalized);
}

function findInSentences(sentences: string[], normalized: string): string | null {
  for (const sentence of sentences) {
    if (sentenceContainsNormalizedWord(sentence, normalized)) return sentence;
  }
  return null;
}

function findSentenceWithPhrase(sentences: string[], phraseNormalized: string): string | null {
  for (const sentence of sentences) {
    if (sentenceContainsPhrase(sentence, phraseNormalized)) return sentence;
  }
  return null;
}

function courseUnitSentences(unitId: string): string[] {
  const unit = findCourseUnitById(unitId);
  if (!unit) return [];
  return unit.sentences.map((row) => getSentenceVariant(row, 'present').text);
}

export function findFlashcardContext(
  entry: VocabEntry,
  savedTexts: SavedText[],
): FlashcardContext | null {
  const kind = getVocabKind(entry);

  if (kind === 'sentence') return null;

  if (kind === 'capsule') {
    const phraseNorm = normalizePhrase(entry.word);
    if (!phraseNorm) return null;

    if (entry.sourceTextId) {
      if (isCourseLessonId(entry.sourceTextId)) {
        const unitId = entry.sourceTextId.slice('course-'.length);
        const found = findSentenceWithPhrase(courseUnitSentences(unitId), phraseNorm);
        if (found && normalizePhrase(found) !== phraseNorm) {
          return { sentence: found, targetNormalized: phraseNorm };
        }
      } else {
        const saved = savedTexts.find((text) => text.id === entry.sourceTextId);
        if (saved) {
          const found = findSentenceWithPhrase(saved.sentences, phraseNorm);
          if (found && normalizePhrase(found) !== phraseNorm) {
            return { sentence: found, targetNormalized: phraseNorm };
          }
        }
      }
    }

    for (const saved of savedTexts) {
      const found = findSentenceWithPhrase(saved.sentences, phraseNorm);
      if (found && normalizePhrase(found) !== phraseNorm) {
        return { sentence: found, targetNormalized: phraseNorm };
      }
    }

    for (const unit of getCourseUnits()) {
      const found = findSentenceWithPhrase(courseUnitSentences(unit.id), phraseNorm);
      if (found && normalizePhrase(found) !== phraseNorm) {
        return { sentence: found, targetNormalized: phraseNorm };
      }
    }

    return null;
  }

  const normalized = entry.normalized;

  if (entry.sourceTextId) {
    if (isCourseLessonId(entry.sourceTextId)) {
      const unitId = entry.sourceTextId.slice('course-'.length);
      const found = findInSentences(courseUnitSentences(unitId), normalized);
      if (found) return { sentence: found, targetNormalized: normalized };
    } else {
      const saved = savedTexts.find((text) => text.id === entry.sourceTextId);
      if (saved) {
        const found = findInSentences(saved.sentences, normalized);
        if (found) return { sentence: found, targetNormalized: normalized };
      }
    }
  }

  for (const saved of savedTexts) {
    const found = findInSentences(saved.sentences, normalized);
    if (found) return { sentence: found, targetNormalized: normalized };
  }

  for (const unit of getCourseUnits()) {
    const found = findInSentences(courseUnitSentences(unit.id), normalized);
    if (found) return { sentence: found, targetNormalized: normalized };
  }

  return null;
}
