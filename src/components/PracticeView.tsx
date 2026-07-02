import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SavedText } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { splitIntoSentences } from '../utils/sentenceSplitter';
import { uniqueWords } from '../utils/wordExtractor';
import { pickWeightedDrillOccurrence } from '../utils/drillPicker';
import type { StudyLanguage } from '../config/languages';
import type { VocabEntry } from '../types';
import { LANGUAGES } from '../config/languages';
import { SAMPLE_B1_EN_TEXT, SAMPLE_B1_TEXT } from '../data/sampleB1Text';
import { TextInput } from './TextInput';
import { PracticeActionBar } from './PracticeActionBar';
import { SentenceList, type SentenceListHandle } from './SentenceList';
import { SentenceNavPanel } from './SentenceNavPanel';
import { WordPanelContainer } from './WordPanel';
import type { DrillWordHighlight } from './SentenceCard';
import type { SpeakOptions } from '../hooks/useSpeech';
import type { SpeechMode } from '../hooks/useSpeech';
import type { SpeechSpeed } from '../utils/speechSpeed';
import { usePracticeKeyboard } from '../hooks/usePracticeKeyboard';
import { ProgressBar } from './ProgressBar';
import type { AudioPrefetchProgress } from '../utils/audioCache';

import type { MemoryCapsule } from '../utils/lessonCapsules';

interface PracticeViewProps {
  studyLanguage: StudyLanguage;
  vocabulary: VocabEntry[];
  onSave: (
    content: string,
    title?: string,
    memory?: { sentences?: string[]; capsules?: MemoryCapsule[] },
  ) => void;
  onSpeak: (text: string, options?: SpeakOptions) => Promise<void>;
  onStop: () => void;
  speaking: boolean;
  studyVoices: SpeechSynthesisVoice[];
  speechMode: SpeechMode;
  getWordVoiceOverrideKey: (word: string) => string | null;
  onSelectWordVoice: (word: string, voice: SpeechSynthesisVoice | null) => void;
  loadedText: SavedText | null;
  loadKey: number;
  onDetachLesson?: () => void;
  onCloseLesson?: () => void;
  onPracticeSaved?: (id: string) => void;
  onNotice?: (message: string) => void;
  onUpdateVocabTranslation?: (word: string, translation: string) => void;
  onSyncLessonMemory?: (sourceTextId: string, sentences: string[], capsules: MemoryCapsule[]) => void;
  prefetchSpeech: (
    texts: string[],
    options?: { onProgress?: (progress: AudioPrefetchProgress) => void },
  ) => Promise<number>;
  speechSpeed: SpeechSpeed;
  onSpeechSpeedChange: (speed: SpeechSpeed) => void;
}

function speechItems(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];
  return [...new Set([...splitIntoSentences(trimmed), ...uniqueWords(trimmed)])];
}

const SWIPE_THRESHOLD = 56;

export function PracticeView({
  studyLanguage,
  vocabulary,
  onSave,
  onSpeak,
  onStop,
  speaking,
  studyVoices,
  speechMode,
  getWordVoiceOverrideKey,
  onSelectWordVoice,
  loadedText,
  loadKey,
  onDetachLesson,
  onCloseLesson,
  onPracticeSaved,
  onNotice,
  onUpdateVocabTranslation,
  onSyncLessonMemory,
  prefetchSpeech,
  speechSpeed,
  onSpeechSpeedChange,
}: PracticeViewProps) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [activeLoadedId, setActiveLoadedId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [drillOccurrence, setDrillOccurrence] = useState<(DrillWordHighlight & { word: string }) | null>(
    null,
  );
  const [drillHighlighted, setDrillHighlighted] = useState(false);
  const [readingAll, setReadingAll] = useState(false);
  const [speakingSentenceIndex, setSpeakingSentenceIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const readAllAbortRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentenceListRef = useRef<SentenceListHandle>(null);
  const lastDrillNormalizedRef = useRef<string | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const {
    getTranslation,
    isLoading,
    hasError,
    isManual,
    fetchTranslation,
    saveManualTranslation,
    translateAllText,
    isTranslatingAll,
    isTextFullyTranslated,
    syncFromCache,
  } = useTranslation(studyLanguage);

  const pendingMemoryRef = useRef<{ sentences: string[]; capsules: MemoryCapsule[] } | null>(null);
  const [audioPrefetch, setAudioPrefetch] = useState<AudioPrefetchProgress | null>(null);

  const prefetchLessonAudio = useCallback(
    async (items: string[]) => {
      setAudioPrefetch(null);
      try {
        return await prefetchSpeech(items, {
          onProgress: (progress) => setAudioPrefetch(progress),
        });
      } finally {
        setAudioPrefetch(null);
      }
    },
    [prefetchSpeech],
  );

  useEffect(() => {
    if (!loadedText) return;
    setText(loadedText.content);
    setTitle(loadedText.title);
    setActiveLoadedId(loadedText.id);
    setSelectedIndex(null);
    setSelectedWord(null);
    setDrillOccurrence(null);
    setDrillHighlighted(false);
    setFocusMode(false);
    setEditorCollapsed(true);
    syncFromCache(loadedText.sentences);
  }, [loadedText, loadKey, syncFromCache]);

  const sentences = useMemo(() => splitIntoSentences(text), [text]);
  const fullyTranslated = isTextFullyTranslated(text);
  const hasSentences = sentences.length > 0;
  const hasText = text.trim().length > 0;

  const applyMemoryFromResult = (capsules: MemoryCapsule[], lessonSentences: string[]) => {
    if (activeLoadedId) {
      onSyncLessonMemory?.(activeLoadedId, lessonSentences, capsules);
      return;
    }
    pendingMemoryRef.current = { sentences: lessonSentences, capsules };
  };

  const handleTranslateAll = async () => {
    const items = speechItems(text);
    const result = await translateAllText(text);
    const audioCount = await prefetchLessonAudio(items);

    if (result.ok) {
      applyMemoryFromResult(result.memoryCapsules, sentences);
      const parts: string[] = [`${result.count} ítems`];
      if (result.memoryCapsules.length > 0) parts.push(`${result.memoryCapsules.length} cápsulas`);
      parts.push(`${sentences.length} oraciones`);
      const audioNote =
        audioCount > 0 ? `${audioCount} audios en caché` : 'pronunciación con voz del dispositivo';
      onNotice?.(`Traducciones listas (${parts.join(' · ')}, ${audioNote})`);
      return;
    }

    onNotice?.('No se pudo traducir la lección');
  };

  const handleSave = async () => {
    if (!text.trim() || saving) return;

    setSaving(true);
    try {
      const items = speechItems(text);
      const translationResult = await translateAllText(text);
      const pending = pendingMemoryRef.current;
      pendingMemoryRef.current = null;
      const capsules =
        translationResult.memoryCapsules.length > 0
          ? translationResult.memoryCapsules
          : (pending?.capsules ?? []);
      const audioCount = await prefetchLessonAudio(items);
      onSave(text, title.trim() || undefined, {
        sentences,
        capsules,
      });
      setTitle('');
      const audioNote =
        audioCount > 0 ? `${audioCount} audios en caché` : 'voz del dispositivo';
      onNotice?.(`Guardado (${audioNote})`);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseLesson = () => {
    setText('');
    setTitle('');
    setActiveLoadedId(null);
    setSelectedIndex(null);
    setSelectedWord(null);
    setDrillOccurrence(null);
    setDrillHighlighted(false);
    setFocusMode(false);
    setEditorCollapsed(false);
    onCloseLesson?.();
  };

  const langConfig = LANGUAGES[studyLanguage];

  const handleLoadSample = () => {
    onDetachLesson?.();
    setText(studyLanguage === 'en' ? SAMPLE_B1_EN_TEXT : SAMPLE_B1_TEXT);
    setActiveLoadedId(null);
    setSelectedIndex(null);
    setSelectedWord(null);
    setDrillOccurrence(null);
    setDrillHighlighted(false);
    setFocusMode(false);
    setTitle('');
    setEditorCollapsed(true);
  };

  const handleReadAll = async () => {
    readAllAbortRef.current = false;
    setReadingAll(true);

    try {
      for (let index = 0; index < sentences.length; index += 1) {
        if (readAllAbortRef.current) break;
        setSpeakingSentenceIndex(index);
        await onSpeak(sentences[index]);
      }
    } finally {
      setSpeakingSentenceIndex(null);
      setReadingAll(false);
      readAllAbortRef.current = false;
    }
  };

  const handleStopReadAll = () => {
    readAllAbortRef.current = true;
    onStop();
    setSpeakingSentenceIndex(null);
    setReadingAll(false);
  };

  const clearDrill = useCallback(() => {
    setDrillOccurrence(null);
    setDrillHighlighted(false);
  }, []);

  const goToSentence = useCallback(
    (index: number, enterFocus = false) => {
      clearDrill();
      setSelectedIndex(index);
      setSelectedWord(null);
      if (enterFocus) setFocusMode(true);
      if (activeLoadedId) onPracticeSaved?.(activeLoadedId);
    },
    [activeLoadedId, clearDrill, onPracticeSaved],
  );

  const speakAtIndex = useCallback(
    (index: number) => {
      const sentence = sentences[index];
      if (!sentence) return;

      if (speaking && speakingSentenceIndex === index) {
        onStop();
        setSpeakingSentenceIndex(null);
        return;
      }

      if (speaking) {
        onStop();
      }

      goToSentence(index);
      setSpeakingSentenceIndex(index);
      void onSpeak(sentence).finally(() => {
        setSpeakingSentenceIndex((current) => (current === index ? null : current));
      });
    },
    [goToSentence, onSpeak, onStop, sentences, speaking, speakingSentenceIndex],
  );

  const goPreviousSentence = useCallback(() => {
    if (sentences.length === 0) return;
    const nextIndex =
      selectedIndex === null ? sentences.length - 1 : Math.max(0, selectedIndex - 1);
    goToSentence(nextIndex, focusMode);
  }, [focusMode, goToSentence, selectedIndex, sentences.length]);

  const goNextSentence = useCallback(() => {
    if (sentences.length === 0) return;
    const nextIndex =
      selectedIndex === null ? 0 : Math.min(sentences.length - 1, selectedIndex + 1);
    goToSentence(nextIndex, focusMode);
  }, [focusMode, goToSentence, selectedIndex, sentences.length]);

  const pronounceCurrentSentence = useCallback(() => {
    if (sentences.length === 0) return;
    const index = selectedIndex ?? 0;
    speakAtIndex(index);
  }, [selectedIndex, sentences.length, speakAtIndex]);

  const handleRandomWordDrill = useCallback(() => {
    if (sentences.length === 0) return;

    if (drillOccurrence && !drillHighlighted) {
      setDrillHighlighted(true);
      void onSpeak(drillOccurrence.word, { word: drillOccurrence.word });
      return;
    }

    const occurrence = pickWeightedDrillOccurrence(
      sentences,
      vocabulary,
      lastDrillNormalizedRef.current,
    );
    if (!occurrence) return;

    lastDrillNormalizedRef.current = occurrence.normalized;
    setDrillOccurrence(occurrence);
    setDrillHighlighted(false);
    setSelectedIndex(occurrence.sentenceIndex);
    setSelectedWord(null);
    setFocusMode(false);
    if (activeLoadedId) onPracticeSaved?.(activeLoadedId);
    void onSpeak(occurrence.word, { word: occurrence.word });
  }, [activeLoadedId, drillHighlighted, drillOccurrence, onPracticeSaved, onSpeak, sentences, vocabulary]);

  const handleSelectWord = useCallback(
    (word: string) => {
      clearDrill();
      setSelectedWord(word);
    },
    [clearDrill],
  );

  const handleSelectSentence = useCallback(
    (index: number) => {
      if (focusMode && selectedIndex === index) return;
      goToSentence(index, editorCollapsed);
    },
    [editorCollapsed, focusMode, goToSentence, selectedIndex],
  );

  const exitFocusMode = useCallback(() => {
    setFocusMode(false);
  }, []);

  const drillHighlight = drillHighlighted && drillOccurrence
    ? { sentenceIndex: drillOccurrence.sentenceIndex, tokenIndex: drillOccurrence.tokenIndex }
    : null;

  const actionBarProps = {
    editorCollapsed,
    onToggleEditor: () => setEditorCollapsed((collapsed) => !collapsed),
    hasText,
    hasSentences,
    readingAll,
    onReadAll: handleReadAll,
    onStopReadAll: handleStopReadAll,
    speaking,
    onTranslate: handleTranslateAll,
    canTranslate: hasText,
    translating: isTranslatingAll,
    translated: fullyTranslated,
    saving,
    isLoadedLesson: Boolean(activeLoadedId),
    onCloseLesson: handleCloseLesson,
    onSave: handleSave,
    canSave: hasText,
  };

  const prefetchingAudio = audioPrefetch !== null && audioPrefetch.remaining > 0;
  const showPracticeProgress = isTranslatingAll || saving || prefetchingAudio;
  const practiceProgressLabel = isTranslatingAll
    ? 'Traduciendo lección…'
    : prefetchingAudio
      ? `Preparando audios… faltan ${audioPrefetch.remaining}`
      : saving
        ? 'Guardando lección…'
        : 'Preparando…';

  useEffect(() => {
    if (!hasSentences) {
      setEditorCollapsed(false);
      setFocusMode(false);
      return;
    }
    setEditorCollapsed(true);
  }, [hasSentences]);

  useEffect(() => {
    if (!drillHighlight) return;
    sentenceListRef.current?.scrollToWord(
      drillHighlight.sentenceIndex,
      drillHighlight.tokenIndex,
    );
  }, [drillHighlight]);

  useEffect(() => {
    if (speakingSentenceIndex === null) return;
    sentenceListRef.current?.scrollToSentence(speakingSentenceIndex);
  }, [speakingSentenceIndex]);

  useEffect(() => {
    if (selectedIndex === null || focusMode) return;
    sentenceListRef.current?.scrollToSentence(selectedIndex);
  }, [focusMode, selectedIndex]);

  usePracticeKeyboard({
    sentencesLength: sentences.length,
    goNextSentence,
    goPreviousSentence,
    handleRandomWordDrill,
    pronounceCurrentSentence,
  });

  const handleSwipeTouchStart = (event: React.TouchEvent) => {
    if (!hasSentences) return;
    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleSwipeTouchEnd = (event: React.TouchEvent) => {
    if (!swipeStartRef.current || !hasSentences) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = touch.clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    if (Math.abs(deltaY) < SWIPE_THRESHOLD || Math.abs(deltaY) < Math.abs(deltaX)) return;

    if (deltaY < 0) goNextSentence();
    else goPreviousSentence();
  };

  return (
    <div className={`practice-view${focusMode ? ' practice-view--focus' : ''}`}>
      {!focusMode && (
        <div className="practice-view__setup">
          <TextInput
            placeholder={langConfig.textPlaceholder}
            title={title}
            onTitleChange={setTitle}
            value={text}
            onChange={(value) => {
              if (activeLoadedId) onDetachLesson?.();
              setText(value);
              setActiveLoadedId(null);
              setSelectedIndex(null);
              setSelectedWord(null);
              setDrillOccurrence(null);
              setDrillHighlighted(false);
              setFocusMode(false);
            }}
            onLoadSample={handleLoadSample}
            isLoadedLesson={Boolean(activeLoadedId)}
            editorCollapsed={editorCollapsed}
            showActions={!editorCollapsed || !hasSentences}
            actions={<PracticeActionBar {...actionBarProps} />}
          />
        </div>
      )}

      {focusMode && (
        <div className="practice-focus-bar">
          <button type="button" className="btn btn--secondary btn--sm" onClick={exitFocusMode}>
            ← Lista
          </button>
          <span className="practice-focus-bar__meta">
            {selectedIndex !== null ? `${selectedIndex + 1}/${sentences.length}` : ''}
          </span>
          <button
            type="button"
            className={`btn btn--sm ${speaking ? 'btn--danger' : 'btn--primary'}`}
            onClick={pronounceCurrentSentence}
          >
            {speaking ? '■' : '▶'}
          </button>
        </div>
      )}

      <div className="practice-view__body">
        <div
          ref={scrollRef}
          className="practice-view__scroll"
          onTouchStart={handleSwipeTouchStart}
          onTouchEnd={handleSwipeTouchEnd}
        >
          {!focusMode && editorCollapsed && hasSentences && (
            <>
              {showPracticeProgress && (
                <ProgressBar
                  indeterminate={isTranslatingAll || !prefetchingAudio}
                  value={audioPrefetch?.done}
                  max={audioPrefetch?.total}
                  showPercent={prefetchingAudio}
                  label={practiceProgressLabel}
                  size="sm"
                  className="practice-progress practice-progress--sticky"
                />
              )}
              <PracticeActionBar {...actionBarProps} sticky />
            </>
          )}

          <SentenceList
            ref={sentenceListRef}
            key={text}
            sentences={sentences}
            selectedIndex={selectedIndex}
            speakingIndex={speakingSentenceIndex}
            selectedWord={selectedWord}
            drillHighlight={drillHighlight}
            focusMode={focusMode}
            getTranslation={getTranslation}
            isTranslationLoading={isLoading}
            hasTranslationError={hasError}
            fetchTranslation={fetchTranslation}
            onSelectSentence={handleSelectSentence}
            onSelectWord={handleSelectWord}
            onSpeakSentence={speakAtIndex}
          />
        </div>

        {hasSentences && !focusMode && (
          <SentenceNavPanel
            selectedIndex={selectedIndex}
            total={sentences.length}
            speaking={speaking && speakingSentenceIndex !== null}
            onRandomWord={handleRandomWordDrill}
            onPrevious={goPreviousSentence}
            onNext={goNextSentence}
            onSpeak={pronounceCurrentSentence}
            speechSpeed={speechSpeed}
            onSpeechSpeedChange={onSpeechSpeedChange}
            speechDisabled={speaking || readingAll}
          />
        )}
      </div>

      <WordPanelContainer
        word={selectedWord}
        getTranslation={getTranslation}
        isTranslationLoading={isLoading}
        hasTranslationError={hasError}
        isManualTranslation={isManual}
        fetchTranslation={fetchTranslation}
        onSaveManualTranslation={(word, translation) => {
          saveManualTranslation(word, translation);
          onUpdateVocabTranslation?.(word, translation);
        }}
        onRefetchTranslation={(word) => {
          void fetchTranslation(word, { force: true });
        }}
        studyVoices={studyVoices}
        wordVoiceKey={selectedWord ? getWordVoiceOverrideKey(selectedWord) : null}
        speechMode={speechMode}
        onClose={() => setSelectedWord(null)}
        onSpeak={onSpeak}
        onSelectWordVoice={onSelectWordVoice}
        onStop={onStop}
        speaking={speaking}
      />
    </div>
  );
}
