import type { StudyLanguage } from '../config/languages';
import type { AppState, FlashcardRating, SavedText, VocabEntry } from '../types';
import { updateSrs } from './spacedRepetition';
import { APP_STATE_VERSION } from '../types';
import { activateTranslationLang, cacheTranslation, getCachedTranslation } from './translate';
import { activateAudioLang } from './audioCache';
import { normalizeWord, uniqueWords } from './wordExtractor';
import { splitIntoSentences, titleFromText } from './sentenceSplitter';

function stateStorageKey(lang: StudyLanguage): string {
  return `french-drill-state-${lang}`;
}

function lastLessonKey(lang: StudyLanguage): string {
  return `french-drill-last-lesson-${lang}`;
}

export function saveLastLessonId(lang: StudyLanguage, id: string): void {
  localStorage.setItem(lastLessonKey(lang), id);
}

export function loadLastLessonId(lang: StudyLanguage): string | null {
  return localStorage.getItem(lastLessonKey(lang));
}

export function clearLastLessonId(lang: StudyLanguage): void {
  localStorage.removeItem(lastLessonKey(lang));
}

function createId(): string {
  return crypto.randomUUID();
}

export function migrateLegacyState(): void {
  try {
    const legacy = localStorage.getItem('french-drill-state');
    if (legacy && !localStorage.getItem(stateStorageKey('fr'))) {
      localStorage.setItem(stateStorageKey('fr'), legacy);
      localStorage.removeItem('french-drill-state');
    }
  } catch {
    // no-op
  }
}

export function activateLanguageStorage(lang: StudyLanguage): void {
  activateTranslationLang(lang);
  activateAudioLang(lang);
}

export function loadState(lang: StudyLanguage): AppState {
  activateLanguageStorage(lang);

  try {
    const raw = localStorage.getItem(stateStorageKey(lang));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    return {
      version: parsed.version ?? APP_STATE_VERSION,
      savedTexts: parsed.savedTexts ?? [],
      vocabulary: (parsed.vocabulary ?? []).map((entry) => {
        const translation = entry.translation ?? getCachedTranslation(entry.word) ?? undefined;
        if (translation) cacheTranslation(entry.word, translation);
        return { ...entry, translation };
      }),
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state: AppState, lang: StudyLanguage): void {
  localStorage.setItem(stateStorageKey(lang), JSON.stringify(state));
}

export function emptyState(): AppState {
  return {
    version: APP_STATE_VERSION,
    savedTexts: [],
    vocabulary: [],
  };
}

export function clearAllLanguageStates(): void {
  for (const lang of ['fr', 'en'] as StudyLanguage[]) {
    localStorage.removeItem(stateStorageKey(lang));
    clearLastLessonId(lang);
  }
  localStorage.removeItem('french-drill-state');
}

function withCachedTranslation(word: string): string | undefined {
  return getCachedTranslation(word) ?? undefined;
}

function backfillVocabularyTranslations(vocabulary: VocabEntry[]): VocabEntry[] {
  return vocabulary.map((entry) => {
    if (entry.translation) return entry;
    const translation = withCachedTranslation(entry.word);
    return translation ? { ...entry, translation } : entry;
  });
}

export function saveText(
  state: AppState,
  content: string,
  customTitle?: string,
): { state: AppState; saved: SavedText } {
  const sentences = splitIntoSentences(content);
  const trimmedTitle = customTitle?.trim();
  const saved: SavedText = {
    id: createId(),
    title: trimmedTitle ? trimmedTitle : titleFromText(content),
    content: content.trim(),
    sentences,
    createdAt: Date.now(),
    lastPracticedAt: Date.now(),
  };

  const existingVocab = new Set(state.vocabulary.map((v) => v.normalized));
  const newWords = uniqueWords(content).filter(
    (word) => !existingVocab.has(normalizeWord(word)),
  );

  const newVocab: VocabEntry[] = newWords.map((word) => {
    const translation = withCachedTranslation(word);
    if (translation) cacheTranslation(word, translation);

    return {
      id: createId(),
      word,
      normalized: normalizeWord(word),
      translation,
      addedAt: Date.now(),
      sourceTextId: saved.id,
    };
  });

  const vocabulary = backfillVocabularyTranslations([...newVocab, ...state.vocabulary]);

  return {
    state: {
      ...state,
      savedTexts: [saved, ...state.savedTexts],
      vocabulary,
    },
    saved,
  };
}

export function rateVocabCard(
  state: AppState,
  vocabId: string,
  rating: FlashcardRating,
): AppState {
  return {
    ...state,
    vocabulary: state.vocabulary.map((entry) =>
      entry.id === vocabId
        ? { ...entry, srs: updateSrs(entry.srs, rating) }
        : entry,
    ),
  };
}

export function deleteVocabEntry(state: AppState, id: string): AppState {
  return {
    ...state,
    vocabulary: state.vocabulary.filter((entry) => entry.id !== id),
  };
}

export function deleteSavedText(state: AppState, id: string): AppState {
  return {
    ...state,
    savedTexts: state.savedTexts.filter((t) => t.id !== id),
  };
}

export function touchSavedText(state: AppState, id: string): AppState {
  return {
    ...state,
    savedTexts: state.savedTexts.map((t) =>
      t.id === id ? { ...t, lastPracticedAt: Date.now() } : t,
    ),
  };
}

export function updateSavedTextTitle(state: AppState, id: string, title: string): AppState {
  const trimmed = title.trim();
  if (!trimmed) return state;

  return {
    ...state,
    savedTexts: state.savedTexts.map((t) => (t.id === id ? { ...t, title: trimmed } : t)),
  };
}

export function updateVocabTranslation(
  state: AppState,
  word: string,
  translation: string,
): AppState {
  const normalized = normalizeWord(word);
  const trimmed = translation.trim();
  if (!normalized || !trimmed) return state;

  return {
    ...state,
    vocabulary: state.vocabulary.map((entry) =>
      entry.normalized === normalized ? { ...entry, translation: trimmed } : entry,
    ),
  };
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): AppState {
  const parsed = JSON.parse(json) as AppState;
  if (!parsed || !Array.isArray(parsed.savedTexts) || !Array.isArray(parsed.vocabulary)) {
    throw new Error('Formato de backup inválido');
  }
  return {
    version: parsed.version ?? APP_STATE_VERSION,
    savedTexts: parsed.savedTexts,
    vocabulary: parsed.vocabulary.map((entry) => ({
      ...entry,
      translation: entry.translation ?? getCachedTranslation(entry.word) ?? undefined,
    })),
  };
}
