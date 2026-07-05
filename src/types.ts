export interface SavedText {
  id: string;
  title: string;
  content: string;
  sentences: string[];
  createdAt: number;
  lastPracticedAt?: number;
  /** Cuándo se generaron cápsulas de memoria para esta lección */
  capsulesAt?: number;
  /** Práctica personal: guardada sin añadir palabras al vocabulario */
  personalPractice?: boolean;
  /** Oraciones completas del curso (solo lecciones course-*; no se persiste) */
  courseSentences?: CourseSentence[];
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
  /** CEFR level from lexicon (A1–B2). */
  lexiconLevel?: string;
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

export type CourseTense = 'present' | 'past' | 'future';

export interface CourseSentence {
  id: string;
  text: string;
  translation: string;
  wordIds: number[];
  text_past?: string;
  text_future?: string;
  translation_past?: string;
  translation_future?: string;
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
  courseUnitId?: string;
}

export interface VocabCategoryFilter {
  category?: FlashcardCategory;
  textId?: string;
  level?: 'A1' | 'A2' | 'B1' | 'B2';
}

export const APP_STATE_VERSION = 2;
