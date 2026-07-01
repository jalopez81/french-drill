import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyLanguage } from '../config/languages';
import type { AppState, FlashcardRating } from '../types';
import {
  deleteSavedText,
  deleteVocabEntry,
  emptyState,
  importState,
  loadState,
  rateVocabCard,
  saveState,
  saveText,
  touchSavedText,
  updateSavedTextTitle,
  updateVocabTranslation,
} from '../utils/storage';
import { persistTranslationCache } from '../utils/translate';

export function useAppState(studyLanguage: StudyLanguage) {
  const [state, setState] = useState<AppState>(() => loadState(studyLanguage));
  const langRef = useRef(studyLanguage);

  useEffect(() => {
    if (langRef.current === studyLanguage) return;
    langRef.current = studyLanguage;
    setState(loadState(studyLanguage));
  }, [studyLanguage]);

  useEffect(() => {
    saveState(state, langRef.current);
  }, [state]);

  const prepareLanguageSwitch = useCallback(
    (currentState: AppState, fromLang: StudyLanguage) => {
      saveState(currentState, fromLang);
      persistTranslationCache(fromLang);
    },
    [],
  );

  const saveCurrentText = useCallback((content: string, title?: string) => {
    setState((prev) => saveText(prev, content, title).state);
  }, []);

  const removeSavedText = useCallback((id: string) => {
    setState((prev) => deleteSavedText(prev, id));
  }, []);

  const markTextPracticed = useCallback((id: string) => {
    setState((prev) => touchSavedText(prev, id));
  }, []);

  const renameSavedText = useCallback((id: string, title: string) => {
    setState((prev) => updateSavedTextTitle(prev, id, title));
  }, []);

  const rateCard = useCallback((vocabId: string, rating: FlashcardRating) => {
    setState((prev) => rateVocabCard(prev, vocabId, rating));
  }, []);

  const removeVocabEntry = useCallback((id: string) => {
    setState((prev) => deleteVocabEntry(prev, id));
  }, []);

  const updateVocabTranslationForWord = useCallback((word: string, translation: string) => {
    setState((prev) => updateVocabTranslation(prev, word, translation));
  }, []);

  const bulkUpdateVocabTranslations = useCallback((updates: Record<string, string>) => {
    setState((prev) => ({
      ...prev,
      vocabulary: prev.vocabulary.map((entry) =>
        updates[entry.word] !== undefined ? { ...entry, translation: updates[entry.word] } : entry,
      ),
    }));
  }, []);

  const restoreFromBackup = useCallback((json: string) => {
    const restored = importState(json);
    setState(restored);
  }, []);

  const resetAll = useCallback(() => {
    setState(emptyState());
  }, []);

  return {
    state,
    setState,
    prepareLanguageSwitch,
    saveCurrentText,
    removeSavedText,
    removeVocabEntry,
    updateVocabTranslationForWord,
    bulkUpdateVocabTranslations,
    markTextPracticed,
    renameSavedText,
    rateCard,
    restoreFromBackup,
    resetAll,
  };
}
