export interface SavedText {
  id: string;
  title: string;
  content: string;
  sentences: string[];
  createdAt: number;
  lastPracticedAt?: number;
  /** Cuándo se generaron cápsulas de memoria para esta lección */
  capsulesAt?: number;
}

export type VocabEntryKind = 'word' | 'capsule' | 'sentence';

export interface VocabEntry {
  id: string;
  word: string;
  normalized: string;
  translation?: string;
  addedAt: number;
  sourceTextId?: string;
  srs?: VocabSrs;
  kind?: VocabEntryKind;
}

export interface VocabSrs {
  ease: number;
  intervalDays: number;
  repetitions: number;
  nextReview: number;
  lastReview?: number;
}

export interface AppState {
  version: number;
  savedTexts: SavedText[];
  vocabulary: VocabEntry[];
}

export interface CourseSentence {
  id: string;
  text: string;
  translation: string;
  wordIds: number[];
}

export interface CourseUnit {
  id: string;
  title: string;
  level: string;
  order: number;
  sentences: CourseSentence[];
}

export type Tab = 'course' | 'practice' | 'texts' | 'vocabulary' | 'flashcards' | 'settings';

export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';

export type FlashcardCategory = 'new' | 'again' | 'hard' | 'good' | 'easy';

export interface FlashcardSessionFilter {
  textId?: string;
  category?: FlashcardCategory;
}

export interface VocabCategoryFilter {
  category?: FlashcardCategory;
  textId?: string;
}

export const APP_STATE_VERSION = 2;
