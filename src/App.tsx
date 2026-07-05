import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SavedText, Tab, FlashcardSessionFilter, CourseUnit } from './types';
import type { FlashcardCategory, VocabCategoryFilter } from './types';
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
import { MemoryAddProvider, useMemoryAddPrompt } from './hooks/useMemoryAddPrompt';
import { BottomNav } from './components/BottomNav';
import { PracticeView } from './components/PracticeView';
import { CourseView } from './components/CourseView';
import { VocabularyList } from './components/VocabularyList';
import { FlashcardsView } from './components/FlashcardsView';
import { SettingsView } from './components/SettingsView';
import { LanguageFlag } from './components/LanguageFlag';
import { ShowTranslationsToggle } from './components/ShowTranslationsToggle';
import { countDue } from './utils/spacedRepetition';
import { migrateLegacyState, clearLastLessonId, loadLastLessonId, saveLastLessonId, loadState, saveState, backfillAllLessonMemoryItems } from './utils/storage';
import { migrateLegacyTranslationCache, setManualTranslation } from './utils/translate';
import {
  mergeLexiconWithUserVocab,
  cacheUnitTranslations,
  buildUnitLessonContent,
  isLexiconPlaceholderId,
  loadCourseData,
  isCourseLoaded,
  getCourseUnits,
  getVocabList,
} from './utils/course';
import { ensureMissingLessonCapsules } from './utils/lessonCapsules';
import {
  filterNewMemoryCandidates,
  previewCourseUnitMemory,
  type MemoryItemCandidate,
} from './utils/memoryPreview';
import { recordStudyActivity } from './utils/progressStats';
import { regenerateVocabularyAssets, regenerateWordAssets } from './utils/regenerateVocabulary';
import type { RegenerateProgress } from './utils/regenerateVocabulary';
import { removeCachedAudio } from './utils/audioCache';
import { markCourseUnitOpened, getOpenedCourseUnits } from './utils/courseOpened';
import { resetAllAppData } from './utils/resetAppData';

function AppContent() {
  const [studyLanguage, setStudyLanguage] = useState<StudyLanguage>(getActiveLanguage);
  const langConfig = LANGUAGES[studyLanguage];
  const { theme, setTheme } = useTheme();
  const { confirm } = useConfirm();
  const { promptMemoryAdd } = useMemoryAddPrompt();

  const {
    state,
    prepareLanguageSwitch,
    saveCurrentText,
    savePersonalText,
    removeSavedText,
    removeVocabEntry,
    updateVocabTranslationForWord,
    bulkUpdateVocabTranslations,
    syncLessonMemory,
    markTextPracticed,
    rateCard,
    restoreFromBackup,
    restoreFullBackup,
    reloadFromStorage,
    resetAll,
    applyUnitToMemory,
    linkCourseUnitVocab,
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
  const [courseReady, setCourseReady] = useState(isCourseLoaded());
  const [openedCourseUnits, setOpenedCourseUnits] = useState(() =>
    getOpenedCourseUnits(studyLanguage),
  );
  const [regeneratingVocab, setRegeneratingVocab] = useState(false);
  const [regenerateProgress, setRegenerateProgress] = useState<RegenerateProgress | null>(null);
  const [showAllTranslations, setShowAllTranslations] = useState(false);

  useEffect(() => {
    migrateLegacyState();
    migrateLegacyTranslationCache();
    loadCourseData().then(() => setCourseReady(true));
  }, []);

  useEffect(() => {
    setOpenedCourseUnits(getOpenedCourseUnits(studyLanguage));
  }, [studyLanguage]);

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
  const lexiconVocabulary = useMemo(
    () => (courseReady ? mergeLexiconWithUserVocab(state.vocabulary) : []),
    [state.vocabulary, courseReady],
  );
  const courseUnitOptions = useMemo(
    () =>
      courseReady
        ? getCourseUnits().map((unit) => ({
            id: unit.id,
            label: `${unit.order}. ${unit.title}`,
          }))
        : [],
    [courseReady],
  );
  const lexiconTotal = useMemo(
    () => (courseReady ? getVocabList().length : 0),
    [courseReady],
  );
  const personalTexts = useMemo(
    () => state.savedTexts.filter((text) => text.personalPractice),
    [state.savedTexts],
  );
  const dueFlashcards = useMemo(() => countDue(studyDeck), [studyDeck]);

  const flashcards = useFlashcards(state.vocabulary, state.savedTexts, flashcardFilter);

  const handleSave = (
    content: string,
    title?: string,
    memory?: { selectedCandidates?: MemoryItemCandidate[] },
  ) => {
    saveCurrentText(content, title, memory);
  };

  const handleStartCourseUnit = useCallback(
    async (unit: CourseUnit) => {
      markCourseUnitOpened(studyLanguage, unit.id);
      setOpenedCourseUnits(getOpenedCourseUnits(studyLanguage));
      cacheUnitTranslations(unit);

      const newCandidates = filterNewMemoryCandidates(
        previewCourseUnitMemory(state.vocabulary, unit),
      );

      if (newCandidates.length > 0) {
        const selected = await promptMemoryAdd(newCandidates, {
          title: 'Añadir a Memoria',
          subtitle: `${unit.level} · ${unit.title}`,
          confirmLabel: 'Añadir y practicar',
          cancelLabel: 'Solo practicar',
        });
        if (selected !== null && selected.length > 0) {
          applyUnitToMemory(unit, selected);
        }
      }

      linkCourseUnitVocab(unit);

      const lesson = buildUnitLessonContent(unit.sentences, 'present');
      const fakeText: SavedText = {
        id: `course-${unit.id}`,
        title: `${unit.level} · ${unit.title}`,
        content: lesson.content,
        sentences: lesson.sentences,
        courseSentences: unit.sentences,
        createdAt: Date.now(),
      };
      setLoadRequest({ text: fakeText, key: Date.now() });
      setTab('practice');
    },
    [
      applyUnitToMemory,
      linkCourseUnitVocab,
      promptMemoryAdd,
      state.vocabulary,
      studyLanguage,
    ],
  );

  const handleDetachLesson = () => {
    clearLastLessonId(studyLanguage);
    setLoadRequest(null);
  };

  const handleCloseLesson = () => {
    clearLastLessonId(studyLanguage);
    setLoadRequest(null);
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

  const handleFlashcardCategoryClick = useCallback((category: FlashcardCategory) => {
    flashcards.startCategorySession(category);
  }, [flashcards]);

  const handleCourseUnitFilterChange = useCallback((unitId: string | null) => {
    setFlashcardFilter(unitId ? { courseUnitId: unitId } : null);
  }, []);

  const handleStudyUnitInMemory = useCallback((unitId: string) => {
    setFlashcardFilter({ courseUnitId: unitId });
    setTab('flashcards');
  }, []);

  const handleLoadPersonal = useCallback((text: SavedText) => {
    setLoadRequest({ text, key: Date.now() });
  }, []);

  const handleDeletePersonal = useCallback(
    (id: string) => {
      removeSavedText(id);
      if (loadRequest?.text.id === id) {
        setLoadRequest(null);
      }
    },
    [loadRequest?.text.id, removeSavedText],
  );

  const handleConfirmDeletePersonal = useCallback(
    (title: string) =>
      confirm({
        title: 'Borrar conversación',
        message: `¿Borrar «${title}»?`,
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
        {(tab === 'vocabulary' || tab === 'practice') && (
          <div className="app-header__actions">
            <ShowTranslationsToggle
              active={showAllTranslations}
              onToggle={() => setShowAllTranslations((v) => !v)}
            />
          </div>
        )}
      </header>

      {saveNotice && <div className="toast">{saveNotice}</div>}

      <main className="app-main">
        {tab === 'course' && (
          <CourseView
            vocabulary={state.vocabulary}
            openedUnits={openedCourseUnits}
            onStudyUnitInMemory={handleStudyUnitInMemory}
            onStartUnit={handleStartCourseUnit}
          />
        )}
        {tab === 'practice' && (
          <PracticeView
            key={studyLanguage}
            studyLanguage={studyLanguage}
            vocabulary={state.vocabulary}
            onSave={handleSave}
            onSavePersonal={savePersonalText}
            personalTexts={personalTexts}
            onLoadPersonal={handleLoadPersonal}
            onDeletePersonal={handleDeletePersonal}
            onConfirmDeletePersonal={handleConfirmDeletePersonal}
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
            promptMemoryAdd={promptMemoryAdd}
            prefetchSpeech={prefetchSpeech}
            speechSpeed={speechSpeed}
            onSpeechSpeedChange={setSpeechSpeed}
            studyVoices={studyVoices}
            speechMode={speechMode}
            getWordVoiceOverrideKey={getWordVoiceOverrideKey}
            onSelectWordVoice={selectWordVoice}
            showAllTranslations={showAllTranslations}
          />
        )}
        {tab === 'vocabulary' && (
          <section className="vocab-view">
            <VocabularyList
              entries={lexiconVocabulary}
              lexiconTotal={lexiconTotal}
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
              onDelete={(id, normalized) => {
                if (isLexiconPlaceholderId(id)) {
                  if (normalized) {
                    const userEntry = state.vocabulary.find((e) => e.normalized === normalized);
                    if (userEntry) removeVocabEntry(userEntry.id);
                  }
                  return;
                }
                removeVocabEntry(id);
              }}
              onConfirmDelete={handleConfirmDeleteWord}
              speaking={speaking}
              showTranslations={showAllTranslations}
            />
          </section>
        )}
        {tab === 'flashcards' && (
          <FlashcardsView
            key={`${studyLanguage}-${flashcardFilter?.courseUnitId ?? ''}-${flashcardFilter?.textId ?? ''}-${flashcardFilter?.category ?? ''}`}
            vocabulary={state.vocabulary}
            savedTexts={state.savedTexts}
            dueCount={flashcards.dueCount}
            totalCount={flashcards.totalCount}
            upcomingReviews={flashcards.upcomingReviews}
            sessionDone={flashcards.sessionDone}
            remainingInSession={flashcards.remainingInSession}
            currentCard={flashcards.currentCard}
            revealed={flashcards.revealed}
            sessionComplete={flashcards.sessionComplete}
            hasDeck={flashcards.hasDeck}
            speaking={speaking}
            courseUnitFilter={flashcardFilter?.courseUnitId ?? null}
            courseUnitOptions={courseUnitOptions}
            onCourseUnitFilterChange={handleCourseUnitFilterChange}
            onReveal={() => flashcards.setRevealed(true)}
            onRate={handleFlashcardRate}
            onSpeak={speakWord}
            onStop={stop}
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
        vocabCount={lexiconVocabulary.length}
        dueFlashcards={dueFlashcards}
      />
    </div>
  );
}

export default function App() {
  return (
    <ConfirmProvider>
      <MemoryAddProvider>
        <AppContent />
      </MemoryAddProvider>
    </ConfirmProvider>
  );
}
