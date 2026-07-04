import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SavedText, Tab } from './types';
import type { FlashcardCategory, FlashcardSessionFilter, VocabCategoryFilter } from './types';
import type { StudyLanguage } from './config/languages';
import {
  getActiveLanguage,
  LANGUAGES,
  setActiveLanguage,
} from './config/languages';
import { useAppState } from './hooks/useAppState';
import { useFlashcards } from './hooks/useFlashcards';
import { useSpeech } from './hooks/useSpeech';
import { useTheme } from './hooks/useTheme';
import { ConfirmProvider, useConfirm } from './hooks/useConfirm';
import { BottomNav } from './components/BottomNav';
import { PracticeView } from './components/PracticeView';
import { CourseView } from './components/CourseView';
import { VocabularyList } from './components/VocabularyList';
import { FlashcardsView } from './components/FlashcardsView';
import { SavedTextsView } from './components/SavedTextsView';
import { SettingsView } from './components/SettingsView';
import { LanguageFlag } from './components/LanguageFlag';
import { countDue } from './utils/spacedRepetition';
import { migrateLegacyState, clearLastLessonId, loadLastLessonId, saveLastLessonId, loadState, saveState, backfillAllLessonMemoryItems } from './utils/storage';
import { migrateLegacyTranslationCache, setManualTranslation, removeCachedTranslation, translateBulk } from './utils/translate';
import { ensureMissingLessonCapsules } from './utils/lessonCapsules';
import type { MemoryCapsule } from './utils/lessonCapsules';
import { recordStudyActivity } from './utils/progressStats';
import { regenerateVocabularyAssets, regenerateWordAssets } from './utils/regenerateVocabulary';
import type { RegenerateProgress } from './utils/regenerateVocabulary';
import { removeCachedAudio } from './utils/audioCache';
import { resetAllAppData } from './utils/resetAppData';

function AppContent() {
  const [studyLanguage, setStudyLanguage] = useState<StudyLanguage>(getActiveLanguage);
  const langConfig = LANGUAGES[studyLanguage];
  const { theme, setTheme } = useTheme();
  const { confirm } = useConfirm();

  const {
    state,
    prepareLanguageSwitch,
    saveCurrentText,
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
    seedVocabFromUnit,
  } = useAppState(studyLanguage);

  const {
    speak,
    stop,
    speaking,
    studyVoice,
    studyVoices,
    selectVoice,
    clearVoice,
    reloadVoices,
    voiceGender,
    selectVoiceGender,
    selectWordVoice,
    getWordVoiceOverrideKey,
    speechMode,
    speechSpeed,
    setSpeechSpeed,
    canUseNativeSpeech: nativeSpeech,
    systemVoiceCount,
    usesOnlineAudio,
    prefetchSpeech,
  } = useSpeech(studyLanguage);

  const [tab, setTab] = useState<Tab>('course');
  const [loadRequest, setLoadRequest] = useState<{ text: SavedText; key: number } | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [flashcardFilter, setFlashcardFilter] = useState<FlashcardSessionFilter | null>(null);
  const [vocabFilter, setVocabFilter] = useState<VocabCategoryFilter | null>(null);
  const [regeneratingVocab, setRegeneratingVocab] = useState(false);
  const [regenerateProgress, setRegenerateProgress] = useState<RegenerateProgress | null>(null);

  useEffect(() => {
    migrateLegacyState();
    migrateLegacyTranslationCache();
  }, []);

  useEffect(() => {
    const lastId = loadLastLessonId(studyLanguage);
    if (!lastId) return;

    if (loadRequest?.text.id === lastId) return;

    const text = state.savedTexts.find((t) => t.id === lastId);
    if (text) {
      setLoadRequest({ text, key: Date.now() });
      return;
    }

    clearLastLessonId(studyLanguage);
  }, [studyLanguage, state.savedTexts, loadRequest?.text.id]);

  const studyDeck = useMemo(
    () => state.vocabulary.filter((entry) => entry.translation),
    [state.vocabulary],
  );
  const dueFlashcards = useMemo(() => countDue(studyDeck), [studyDeck]);

  const flashcards = useFlashcards(state.vocabulary, state.savedTexts, flashcardFilter);

  const handleSave = (
    content: string,
    title?: string,
    memory?: { sentences?: string[]; capsules?: MemoryCapsule[] },
  ) => {
    saveCurrentText(content, title, memory);
  };

  const handleLoadText = (text: SavedText) => {
    saveLastLessonId(studyLanguage, text.id);
    setLoadRequest({ text, key: Date.now() });
    setTab('practice');
  };

  const handleDetachLesson = () => {
    clearLastLessonId(studyLanguage);
    setLoadRequest(null);
  };

  const handleCloseLesson = () => {
    clearLastLessonId(studyLanguage);
    setLoadRequest(null);
  };

  const handleDeleteText = (id: string) => {
    removeSavedText(id);
    if (loadLastLessonId(studyLanguage) === id) {
      clearLastLessonId(studyLanguage);
    }
    if (loadRequest?.text.id === id) {
      setLoadRequest(null);
    }
  };

  const handlePracticeSaved = (id: string) => {
    markTextPracticed(id);
    saveLastLessonId(studyLanguage, id);
    recordStudyActivity(studyLanguage);
  };

  const handleLanguageChange = (newLang: StudyLanguage) => {
    if (newLang === studyLanguage) return;

    prepareLanguageSwitch(state, studyLanguage);
    setActiveLanguage(newLang);
    setStudyLanguage(newLang);
    setTab('course');
    setFlashcardFilter(null);
    setVocabFilter(null);
    stop();
  };

  const handleResetAll = async () => {
    const confirmed = await confirm({
      title: 'Resetear toda la app',
      message:
        'Se borrarán todas las lecciones, vocabulario, progreso de memoria, traducciones en caché y audios guardados en todos los idiomas. Esta acción no se puede deshacer.',
      confirmLabel: 'Resetear todo',
      variant: 'danger',
    });
    if (!confirmed) return;

    await resetAllAppData();
    resetAll();
    setLoadRequest(null);
    setFlashcardFilter(null);
    setVocabFilter(null);
    setSaveNotice(null);
    clearVoice();
    reloadVoices();
    setTab('course');
  };

  const speakWord = useCallback((word: string) => speak(word, { word }), [speak]);

  const handleSaveWordTranslation = useCallback(
    (word: string, translation: string) => {
      setManualTranslation(word, translation);
      updateVocabTranslationForWord(word, translation);
    },
    [updateVocabTranslationForWord],
  );

  const handleRefetchWordTranslation = useCallback(
    async (word: string) => {
      removeCachedTranslation(word);
      try {
        const result = await translateBulk([word]);
        const translated = result.translations[word];
        if (translated) {
          updateVocabTranslationForWord(word, translated);
        }
        return translated ?? null;
      } catch {
        return null;
      }
    },
    [updateVocabTranslationForWord],
  );

  const handleRegenerateWord = useCallback(
    async (word: string) => {
      const result = await regenerateWordAssets(word, { skipManual: false });
      if (result.translation) {
        updateVocabTranslationForWord(word, result.translation);
      }
      if (usesOnlineAudio()) {
        await removeCachedAudio(word);
        await prefetchSpeech([word]);
      }
      return result.translation;
    },
    [prefetchSpeech, updateVocabTranslationForWord, usesOnlineAudio],
  );

  const handleRegenerateAllVocab = useCallback(async () => {
    if (state.vocabulary.length === 0 || regeneratingVocab) return;

    const confirmed = await confirm({
      title: 'Regenerar vocabulario',
      message:
        'Se volverán a buscar traducciones y audios para todas las palabras.\n\nLas traducciones manuales se conservan, pero sus audios se regeneran.',
      confirmLabel: 'Regenerar',
    });
    if (!confirmed) return;

    setRegeneratingVocab(true);
    setRegenerateProgress({ done: 0, total: state.vocabulary.length, phase: 'translate' });

    try {
      const result = await regenerateVocabularyAssets(
        state.vocabulary,
        prefetchSpeech,
        {
          skipManual: true,
          prefetchAudio: usesOnlineAudio(),
          onProgress: setRegenerateProgress,
        },
      );

      if (Object.keys(result.translations).length > 0) {
        bulkUpdateVocabTranslations(result.translations);
      }

      const parts = [`${result.translated} traducciones`];
      if (usesOnlineAudio()) {
        parts.push(`${result.audioCount} audios`);
      }
      if (result.skippedManual > 0) parts.push(`${result.skippedManual} manuales intactas`);
      if (result.failed > 0) parts.push(`${result.failed} fallidas`);

      setSaveNotice(`Regenerado: ${parts.join(' · ')}`);
      window.setTimeout(() => setSaveNotice(null), 3500);
    } finally {
      setRegeneratingVocab(false);
      setRegenerateProgress(null);
    }
  }, [
    bulkUpdateVocabTranslations,
    confirm,
    prefetchSpeech,
    regeneratingVocab,
    state.vocabulary,
    usesOnlineAudio,
  ]);

  const handleFlashcardRate = useCallback(
    (rating: Parameters<typeof flashcards.rateCard>[0]) => {
      flashcards.rateCard(rating, (id, cardRating) => {
        rateCard(id, cardRating);
        recordStudyActivity(studyLanguage);
      });
    },
    [flashcards, rateCard, studyLanguage],
  );

  const handleLessonCategoryClick = useCallback(
    (textId: string, category: FlashcardCategory) => {
      setFlashcardFilter({ textId, category });
      setTab('flashcards');
    },
    [],
  );

  const handleFlashcardCategoryClick = useCallback((category: FlashcardCategory) => {
    flashcards.startCategorySession(category);
  }, [flashcards]);

  const handleVocabCategoryClick = useCallback((category: FlashcardCategory) => {
    setVocabFilter({ category });
    setTab('vocabulary');
  }, []);

  const handleConfirmDeleteLesson = useCallback(
    (title: string) =>
      confirm({
        title: 'Borrar lección',
        message: `¿Borrar la lección «${title}»?\n\nLas palabras del vocabulario no se borran.`,
        confirmLabel: 'Borrar',
        variant: 'danger',
      }),
    [confirm],
  );

  const handleConfirmDeleteWord = useCallback(
    (word: string) =>
      confirm({
        title: 'Borrar palabra',
        message: `¿Borrar «${word}» del vocabulario?\n\nTambién desaparecerá de Memoria.`,
        confirmLabel: 'Borrar',
        variant: 'danger',
      }),
    [confirm],
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__logo">
            <LanguageFlag lang={studyLanguage} className="language-flag language-flag--header" />
          </span>
          <div>
            <h1 className="app-header__title">{langConfig.appTitle}</h1>
            <p className="app-header__subtitle">{langConfig.subtitle}</p>
          </div>
        </div>
      </header>

      {saveNotice && <div className="toast">{saveNotice}</div>}

      <main className="app-main">
        {tab === 'course' && (
          <CourseView
            vocabulary={state.vocabulary}
            onStartUnit={(unit) => {
              seedVocabFromUnit(unit);
              // Build a SavedText-shaped object from the unit for PracticeView
              const content = unit.sentences.map((s) => s.text).join('\n');
              const fakeText = {
                id: `course-${unit.id}`,
                title: `${unit.level} · ${unit.title}`,
                content,
                sentences: unit.sentences.map((s) => s.text),
                createdAt: 0,
              };
              setLoadRequest({ text: fakeText as any, key: Date.now() });
              setTab('practice');
            }}
          />
        )}
        {tab === 'practice' && (
          <PracticeView
            key={studyLanguage}
            studyLanguage={studyLanguage}
            vocabulary={state.vocabulary}
            onSave={handleSave}
            onSpeak={speak}
            onStop={stop}
            speaking={speaking}
            loadedText={loadRequest?.text ?? null}
            loadKey={loadRequest?.key ?? 0}
            onDetachLesson={handleDetachLesson}
            onCloseLesson={handleCloseLesson}
            onPracticeSaved={handlePracticeSaved}
            isSandbox={loadRequest === null}
            onNotice={(message) => {
              setSaveNotice(message);
              window.setTimeout(() => setSaveNotice(null), 2500);
            }}
            onUpdateVocabTranslation={handleSaveWordTranslation}
            onSyncLessonMemory={syncLessonMemory}
            prefetchSpeech={prefetchSpeech}
            speechSpeed={speechSpeed}
            onSpeechSpeedChange={setSpeechSpeed}
            studyVoices={studyVoices}
            speechMode={speechMode}
            getWordVoiceOverrideKey={getWordVoiceOverrideKey}
            onSelectWordVoice={selectWordVoice}
          />
        )}
        {tab === 'texts' && (
          <SavedTextsView
            texts={state.savedTexts}
            vocabulary={state.vocabulary}
            studyLanguage={studyLanguage}
            onPractice={handleLoadText}
            onDelete={handleDeleteText}
            onUpdateTitle={renameSavedText}
            onCategoryClick={handleLessonCategoryClick}
            onVocabCategoryClick={handleVocabCategoryClick}
            onConfirmDelete={handleConfirmDeleteLesson}
          />
        )}
        {tab === 'vocabulary' && (
          <section className="vocab-view">
            <VocabularyList
              entries={state.vocabulary}
              savedTexts={state.savedTexts}
              categoryFilter={vocabFilter}
              onClearCategoryFilter={() => setVocabFilter(null)}
              onCategoryFilter={(category) =>
                setVocabFilter(category ? { category } : null)
              }
              onSpeak={speakWord}
              onSaveTranslation={handleSaveWordTranslation}
              onRegenerateWord={handleRegenerateWord}
              onRegenerateAll={() => void handleRegenerateAllVocab()}
              regenerating={regeneratingVocab}
              regenerateProgress={regenerateProgress}
              onDelete={removeVocabEntry}
              onConfirmDelete={handleConfirmDeleteWord}
              speaking={speaking}
            />
          </section>
        )}
        {tab === 'flashcards' && (
          <FlashcardsView
            key={`${studyLanguage}-${flashcardFilter?.textId ?? ''}-${flashcardFilter?.category ?? ''}`}
            vocabulary={state.vocabulary}
            dueCount={flashcards.dueCount}
            totalCount={flashcards.totalCount}
            sessionDone={flashcards.sessionDone}
            remainingInSession={flashcards.remainingInSession}
            currentCard={flashcards.currentCard}
            revealed={flashcards.revealed}
            sessionComplete={flashcards.sessionComplete}
            hasDeck={flashcards.hasDeck}
            speaking={speaking}
            onReveal={() => flashcards.setRevealed(true)}
            onRate={handleFlashcardRate}
            onSpeak={speakWord}
            onSaveTranslation={handleSaveWordTranslation}
            onRefetchTranslation={handleRefetchWordTranslation}
            onRestart={() => flashcards.rebuildQueue('due')}
            onStudyAll={() => flashcards.rebuildQueue('all')}
            onCategoryClick={handleFlashcardCategoryClick}
          />
        )}
        {tab === 'settings' && (
          <SettingsView
            studyLanguage={studyLanguage}
            onLanguageChange={handleLanguageChange}
            state={state}
            studyVoice={studyVoice}
            studyVoices={studyVoices}
            voiceGender={voiceGender}
            onSelectVoiceGender={selectVoiceGender}
            onSelectVoice={selectVoice}
            onClearVoice={clearVoice}
            onReloadVoices={reloadVoices}
            onTestVoice={() => speak(langConfig.voiceTestPhrase)}
            usesOnlineAudio={usesOnlineAudio()}
            canUseNativeSpeech={nativeSpeech}
            systemVoiceCount={systemVoiceCount}
            theme={theme}
            onThemeChange={setTheme}
            onImport={(json) => {
              try {
                restoreFromBackup(json);
                alert('Backup importado correctamente');
              } catch {
                alert('No se pudo importar el backup');
              }
            }}
            onFullRestore={async (backup) => {
              restoreFullBackup(backup);
              const langs = Object.keys(LANGUAGES) as StudyLanguage[];
              let capsulesAdded = 0;
              for (const lang of langs) {
                const loaded = backfillAllLessonMemoryItems(loadState(lang));
                const { state: next, capsulesAdded: added } = await ensureMissingLessonCapsules(
                  loaded,
                  lang,
                );
                saveState(next, lang);
                capsulesAdded += added;
              }
              reloadFromStorage();
              const nextLang = getActiveLanguage();
              if (nextLang !== studyLanguage) {
                setStudyLanguage(nextLang);
              }
              const notice =
                capsulesAdded > 0
                  ? `Datos importados · ${capsulesAdded} cápsulas generadas`
                  : 'Datos importados de la nube';
              setSaveNotice(notice);
              window.setTimeout(() => setSaveNotice(null), 4000);
            }}
            onResetAll={handleResetAll}
          />
        )}
      </main>

      <BottomNav
        active={tab}
        onChange={setTab}
        vocabCount={state.vocabulary.length}
        dueFlashcards={dueFlashcards}
        savedTextsCount={state.savedTexts.length}
      />
    </div>
  );
}

export default function App() {
  return (
    <ConfirmProvider>
      <AppContent />
    </ConfirmProvider>
  );
}
