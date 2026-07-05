import type { AppState, CourseUnit, VocabEntry, VocabEntryKind } from '../types';
import { getUnitUniqueWordIds, getVocabWordById } from './course';
import type { MemoryCapsule } from './lessonCapsules';
import { cacheTranslation } from './translate';
import { normalizePhrase, normalizeWord, uniqueWords } from './wordExtractor';
import { getCachedTranslation } from './translate';

export interface MemoryItemCandidate {
  key: string;
  kind: VocabEntryKind;
  word: string;
  translation?: string;
  normalized: string;
  lexiconLevel?: string;
  alreadyInMemory: boolean;
}

export function memoryItemKey(kind: VocabEntryKind, normalized: string): string {
  return `${kind}:${normalized}`;
}

function occupiedNormalized(vocabulary: VocabEntry[]): Set<string> {
  return new Set(vocabulary.map((entry) => entry.normalized));
}

export function filterNewMemoryCandidates(candidates: MemoryItemCandidate[]): MemoryItemCandidate[] {
  return candidates.filter((item) => !item.alreadyInMemory);
}

export function previewCourseUnitMemory(vocabulary: VocabEntry[], unit: CourseUnit): MemoryItemCandidate[] {
  const occupied = occupiedNormalized(vocabulary);
  const items: MemoryItemCandidate[] = [];
  const seen = new Set<string>();

  for (const id of getUnitUniqueWordIds(unit)) {
    const lex = getVocabWordById(id);
    if (!lex) continue;

    const normalized = normalizeWord(lex.word);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    items.push({
      key: memoryItemKey('word', normalized),
      kind: 'word',
      word: lex.word,
      translation: lex.translation,
      normalized,
      lexiconLevel: lex.level,
      alreadyInMemory: occupied.has(normalized),
    });
  }

  return items;
}

export function previewLessonMemoryItems(
  vocabulary: VocabEntry[],
  content: string,
  sentences: string[],
  capsules: MemoryCapsule[] = [],
): MemoryItemCandidate[] {
  const occupied = occupiedNormalized(vocabulary);
  const items: MemoryItemCandidate[] = [];
  const seen = new Set<string>();

  const push = (candidate: MemoryItemCandidate) => {
    if (seen.has(candidate.key)) return;
    seen.add(candidate.key);
    items.push(candidate);
  };

  for (const word of uniqueWords(content)) {
    const normalized = normalizeWord(word);
    push({
      key: memoryItemKey('word', normalized),
      kind: 'word',
      word,
      translation: getCachedTranslation(word) ?? undefined,
      normalized,
      alreadyInMemory: occupied.has(normalized),
    });
  }

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    const translation = getCachedTranslation(trimmed);
    if (!translation) continue;

    const normalized = normalizePhrase(trimmed);
    if (!normalized) continue;

    push({
      key: memoryItemKey('sentence', normalized),
      kind: 'sentence',
      word: trimmed,
      translation,
      normalized,
      alreadyInMemory: occupied.has(normalized),
    });
  }

  const seenCapsules = new Set<string>();
  for (const capsule of capsules) {
    const phrase = capsule.phrase.trim();
    const translation = capsule.translation.trim();
    if (!phrase || !translation) continue;

    const normalized = normalizePhrase(phrase);
    if (!normalized || seenCapsules.has(normalized)) continue;
    seenCapsules.add(normalized);

    push({
      key: memoryItemKey('capsule', normalized),
      kind: 'capsule',
      word: phrase,
      translation,
      normalized,
      alreadyInMemory: occupied.has(normalized),
    });
  }

  return items;
}

export function previewSyncMemoryItems(
  vocabulary: VocabEntry[],
  sentences: string[],
  capsules: MemoryCapsule[] = [],
): MemoryItemCandidate[] {
  return previewLessonMemoryItems(vocabulary, '', sentences, capsules).filter(
    (item) => item.kind !== 'word',
  );
}

export function createVocabEntryFromCandidate(
  candidate: MemoryItemCandidate,
  sourceTextId: string,
): VocabEntry {
  return {
    id: crypto.randomUUID(),
    word: candidate.word,
    normalized: candidate.normalized,
    translation: candidate.translation,
    kind: candidate.kind,
    sourceTextId,
    addedAt: Date.now(),
    lexiconLevel: candidate.lexiconLevel,
  };
}

export function applyMemoryCandidates(
  state: AppState,
  candidates: MemoryItemCandidate[],
  sourceTextId: string,
): AppState {
  const newEntries = candidates
    .filter((candidate) => !candidate.alreadyInMemory)
    .map((candidate) => createVocabEntryFromCandidate(candidate, sourceTextId));

  if (newEntries.length === 0) return state;

  for (const entry of newEntries) {
    if (entry.translation) cacheTranslation(entry.word, entry.translation);
  }

  return {
    ...state,
    vocabulary: [...newEntries, ...state.vocabulary],
  };
}

export function linkUnitVocabularySource(state: AppState, unit: CourseUnit): AppState {
  const courseSourceId = `course-${unit.id}`;
  const userByNormalized = new Map(state.vocabulary.map((entry) => [entry.normalized, entry]));
  let vocabulary = state.vocabulary;
  let changed = false;

  for (const id of getUnitUniqueWordIds(unit)) {
    const lex = getVocabWordById(id);
    if (!lex) continue;

    const normalized = normalizeWord(lex.word);
    const existing = userByNormalized.get(normalized);
    if (existing && existing.sourceTextId !== courseSourceId) {
      vocabulary = vocabulary.map((entry) =>
        entry.id === existing.id ? { ...entry, sourceTextId: courseSourceId } : entry,
      );
      changed = true;
    }
  }

  return changed ? { ...state, vocabulary } : state;
}
