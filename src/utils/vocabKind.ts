import type { VocabEntry, VocabEntryKind } from '../types';

export function getVocabKind(entry: VocabEntry): VocabEntryKind {
  if (entry.kind === 'capsule' || entry.kind === 'sentence') return entry.kind;
  return 'word';
}

export function vocabKindLabel(kind: VocabEntryKind): string {
  switch (kind) {
    case 'capsule':
      return 'Cápsula';
    case 'sentence':
      return 'Oración';
    default:
      return 'Palabra';
  }
}

export function vocabKindChipClass(kind: VocabEntryKind): string {
  switch (kind) {
    case 'capsule':
      return 'vocab-card__chip vocab-card__chip--capsule';
    case 'sentence':
      return 'vocab-card__chip vocab-card__chip--sentence';
    default:
      return 'vocab-card__chip vocab-card__chip--word';
  }
}

export function vocabKindPillClass(kind: VocabEntryKind): string {
  switch (kind) {
    case 'capsule':
      return 'pill pill--purple';
    case 'sentence':
      return 'pill pill--sentence';
    default:
      return 'pill pill--blue';
  }
}

export interface VocabKindBuckets {
  word: VocabEntry[];
  capsule: VocabEntry[];
  sentence: VocabEntry[];
}

export function bucketVocabByKind(vocabulary: VocabEntry[]): VocabKindBuckets {
  const withTranslation = vocabulary.filter((entry) => entry.translation);
  return {
    word: withTranslation.filter((entry) => getVocabKind(entry) === 'word'),
    capsule: withTranslation.filter((entry) => getVocabKind(entry) === 'capsule'),
    sentence: withTranslation.filter((entry) => getVocabKind(entry) === 'sentence'),
  };
}
