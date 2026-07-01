import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SavedText, Tab } from './types';
import type { StudyLanguage } from './config/languages';
import {
  getActiveLanguage,
  LANGUAGES,
  setActiveLanguage,
} from './config/languages';
import { useAppState } from './hooks/useAppState';
import { useFlashcards } from './hooks/useFlashcards';
import { useSpeech } from './hooks/useSpeech';
import { BottomNav } from './components/BottomNav';
import { PracticeView } from './components/PracticeView';
import { VocabularyList } from './components/VocabularyList';
import { FlashcardsView } from './components/FlashcardsView';
import { SavedTextsView } from './components/SavedTextsView';
import { SettingsView } from './components/SettingsView';
import { LanguageFlag } from './components/LanguageFlag';
import { countDue } from './utils/spacedRepetition';
import { migrateLegacyState, clearLastLessonId, loadLastLessonId, saveLastLessonId } from './utils/storage';
import { migrateLegacyTranslationCache, initTranslationProvider, setTranslationProvider, setManualTranslation, removeCachedTranslation, translateToSpanish } from './utils/translate';
import type { TranslationProvider } from './utils/translate';

export default function App() {
  const [studyLanguage, setStudyLanguage] = useState<StudyLanguage>(getActiveLanguage);
  const langConfig = LANGUAGES[studyLanguage];

  const {
    state,
    prepareLanguageSwitch,
    saveCurrentText,
    removeSavedText,
    removeVocabEntry,
    updateVocabTranslationForWord,
    markTextPracticed,
    rateCard,
    restoreFromBackup,
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
    prefetchSpeech,
  } = useSpeech(studyLanguage);

  const [tab, setTab] = useState<Tab>('practice');
  const [loadRequest, setLoadRequest] = useState<{ text: SavedText; key: number } | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [translationProvider, setTranslationProviderState] = useState<TranslationProvider>(() =>
    initTranslationProvider(),
  );

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

  const flashcards = useFlashcards(state.vocabulary);

  const handleSave = (content: string, title?: string) => {
    saveCurrentText(content, title);
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
  };

  const handleLanguageChange = (newLang: StudyLanguage) => {
    if (newLang === studyLanguage) return;

    prepareLanguageSwitch(state, studyLanguage);
    setActiveLanguage(newLang);
    setStudyLanguage(newLang);
    setTab('practice');
    stop();
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
        const translated = await translateToSpanish(word, { force: true });
        updateVocabTranslationForWord(word, translated);
        return translated;
      } catch {
        return null;
      }
    },
    [updateVocabTranslationForWord],
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
        {tab === 'practice' && (
          <PracticeView
            key={studyLanguage}
            studyLanguage={studyLanguage}
            onSave={handleSave}
            onSpeak={speak}
            onStop={stop}
            speaking={speaking}
            loadedText={loadRequest?.text ?? null}
            loadKey={loadRequest?.key ?? 0}
            onDetachLesson={handleDetachLesson}
            onCloseLesson={handleCloseLesson}
            onPracticeSaved={handlePracticeSaved}
            onNotice={(message) => {
              setSaveNotice(message);
              window.setTimeout(() => setSaveNotice(null), 2500);
            }}
            onUpdateVocabTranslation={handleSaveWordTranslation}
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
            onPractice={handleLoadText}
            onDelete={handleDeleteText}
          />
        )}
        {tab === 'vocabulary' && (
          <section className="vocab-view">
            <h2 className="section-title">Vocabulario ({state.vocabulary.length})</h2>
            <VocabularyList
              entries={state.vocabulary}
              onSpeak={speakWord}
              onSaveTranslation={handleSaveWordTranslation}
              onRefetchTranslation={handleRefetchWordTranslation}
              onDelete={removeVocabEntry}
              speaking={speaking}
            />
          </section>
        )}
        {tab === 'flashcards' && (
          <FlashcardsView
            key={studyLanguage}
            vocabulary={state.vocabulary}
            flashcardLangLabel={langConfig.flashcardLangLabel}
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
            onRate={(rating) => flashcards.rateCard(rating, rateCard)}
            onSpeak={speakWord}
            onSaveTranslation={handleSaveWordTranslation}
            onRefetchTranslation={handleRefetchWordTranslation}
            onRestart={() => flashcards.rebuildQueue('due')}
            onStudyAll={() => flashcards.rebuildQueue('all')}
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
            speechMode={speechMode}
            canUseNativeSpeech={nativeSpeech}
            systemVoiceCount={systemVoiceCount}
            translationProvider={translationProvider}
            onTranslationProviderChange={(provider) => {
              setTranslationProvider(provider);
              setTranslationProviderState(provider);
            }}
            onImport={(json) => {
              try {
                restoreFromBackup(json);
                alert('Backup importado correctamente');
              } catch {
                alert('No se pudo importar el backup');
              }
            }}
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
