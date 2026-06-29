import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyLanguage } from '../config/languages';
import type { AppState, FlashcardRating } from '../types';
import {
  deleteSavedText,
  importState,
  loadState,
  rateVocabCard,
  saveState,
  saveText,
  touchSavedText,
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

  const rateCard = useCallback((vocabId: string, rating: FlashcardRating) => {
    setState((prev) => rateVocabCard(prev, vocabId, rating));
  }, []);

  const restoreFromBackup = useCallback((json: string) => {
    const restored = importState(json);
    setState(restored);
  }, []);

  return {
    state,
    setState,
    prepareLanguageSwitch,
    saveCurrentText,
    removeSavedText,
    markTextPracticed,
    rateCard,
    restoreFromBackup,
  };
}
