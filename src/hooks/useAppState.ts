import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyLanguage } from '../config/languages';
import type { AppState, FlashcardRating, CourseUnit } from '../types';
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
  updateSavedTextContent,
  upsertVocabTranslation,
  syncLessonMemoryItems,
} from '../utils/storage';
import { persistTranslationCache } from '../utils/translate';
import { applyFullBackup, type FullAppBackup } from '../utils/fullBackup';
import type { MemoryCapsule } from '../utils/lessonCapsules';
import { getLexiconLevelForWord } from '../utils/course';
import {
  applyMemoryCandidates,
  linkUnitVocabularySource,
  type MemoryItemCandidate,
} from '../utils/memoryPreview';

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

  const saveCurrentText = useCallback(
    (
      content: string,
      title?: string,
      memory?: { selectedCandidates?: MemoryItemCandidate[] },
    ) => {
      setState((prev) => {
        const { state, saved } = saveText(prev, content, title, { skipVocabulary: true });
        if (!memory?.selectedCandidates?.length) return state;

        const sourceTextId = saved.id;
        const words = memory.selectedCandidates.filter((item) => item.kind === 'word');
        const sentences = memory.selectedCandidates
          .filter((item) => item.kind === 'sentence')
          .map((item) => item.word);
        const capsules: MemoryCapsule[] = memory.selectedCandidates
          .filter((item) => item.kind === 'capsule')
          .map((item) => ({
            phrase: item.word,
            translation: item.translation ?? '',
          }))
          .filter((item) => item.phrase && item.translation);

        let next = applyMemoryCandidates(state, words, sourceTextId);
        return syncLessonMemoryItems(next, sourceTextId, sentences, capsules);
      });
    },
    [],
  );

  const savePersonalText = useCallback(
    (content: string, title?: string, existingId?: string) => {
      setState((prev) => {
        if (existingId) {
          return updateSavedTextContent(prev, existingId, content, title);
        }
        return saveText(prev, content, title, {
          skipVocabulary: true,
          personalPractice: true,
        }).state;
      });
    },
    [],
  );

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
    setState((prev) =>
      upsertVocabTranslation(prev, word, translation, {
        lexiconLevel: getLexiconLevelForWord(word),
      }),
    );
  }, []);

  const bulkUpdateVocabTranslations = useCallback((updates: Record<string, string>) => {
    setState((prev) => ({
      ...prev,
      vocabulary: prev.vocabulary.map((entry) =>
        updates[entry.word] !== undefined ? { ...entry, translation: updates[entry.word] } : entry,
      ),
    }));
  }, []);

  const syncLessonMemory = useCallback(
    (sourceTextId: string, selectedCandidates: MemoryItemCandidate[]) => {
      setState((prev) => {
        const sentences = selectedCandidates
          .filter((item) => item.kind === 'sentence')
          .map((item) => item.word);
        const capsules: MemoryCapsule[] = selectedCandidates
          .filter((item) => item.kind === 'capsule')
          .map((item) => ({
            phrase: item.word,
            translation: item.translation ?? '',
          }))
          .filter((item) => item.phrase && item.translation);

        return syncLessonMemoryItems(prev, sourceTextId, sentences, capsules);
      });
    },
    [],
  );

  const applyUnitToMemory = useCallback((unit: CourseUnit, selected: MemoryItemCandidate[]) => {
    setState((prev) => {
      let next = linkUnitVocabularySource(prev, unit);
      const words = selected.filter((item) => item.kind === 'word');
      return applyMemoryCandidates(next, words, `course-${unit.id}`);
    });
  }, []);

  const linkCourseUnitVocab = useCallback((unit: CourseUnit) => {
    setState((prev) => linkUnitVocabularySource(prev, unit));
  }, []);

  const restoreFromBackup = useCallback((json: string) => {
    const restored = importState(json);
    setState(restored);
  }, []);

  const restoreFullBackup = useCallback((backup: FullAppBackup) => {
    applyFullBackup(backup);
    setState(loadState(langRef.current));
  }, []);

  const reloadFromStorage = useCallback(() => {
    setState(loadState(langRef.current));
  }, []);

  const resetAll = useCallback(() => {
    setState(emptyState());
  }, []);

  return {
    state,
    setState,
    prepareLanguageSwitch,
    saveCurrentText,
    savePersonalText,
    removeSavedText,
    removeVocabEntry,
    updateVocabTranslationForWord,
    bulkUpdateVocabTranslations,
    syncLessonMemory,
    markTextPracticed,
    renameSavedText,
    rateCard,
    restoreFromBackup,
    restoreFullBackup,
    reloadFromStorage,
    resetAll,
    applyUnitToMemory,
    linkCourseUnitVocab,
  };
}
