import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SavedText } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { splitIntoSentences } from '../utils/sentenceSplitter';
import { uniqueWords } from '../utils/wordExtractor';
import { tokenizeSentence } from '../utils/tokenize';
import type { StudyLanguage } from '../config/languages';
import { LANGUAGES } from '../config/languages';
import { SAMPLE_B1_EN_TEXT, SAMPLE_B1_TEXT } from '../data/sampleB1Text';
import { TextInput } from './TextInput';
import { SentenceList } from './SentenceList';
import { SentenceNavPanel } from './SentenceNavPanel';
import { SpeechSpeedControl } from './SpeechSpeedControl';
import { WordPanelContainer } from './WordPanel';
import type { DrillWordHighlight } from './SentenceCard';
import type { SpeechSpeed } from '../utils/speechSpeed';

interface PracticeViewProps {
  studyLanguage: StudyLanguage;
  onSave: (content: string, title?: string) => void;
  onSpeak: (text: string) => Promise<void>;
  onStop: () => void;
  speaking: boolean;
  loadedText: SavedText | null;
  loadKey: number;
  onDetachLesson?: () => void;
  onCloseLesson?: () => void;
  onPracticeSaved?: (id: string) => void;
  onNotice?: (message: string) => void;
  prefetchSpeech: (texts: string[]) => Promise<number>;
  speechSpeed: SpeechSpeed;
  onSpeechSpeedChange: (speed: SpeechSpeed) => void;
}

function speechItems(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];
  return [...new Set([...splitIntoSentences(trimmed), ...uniqueWords(trimmed)])];
}

function pickRandomWordOccurrence(sentences: string[]): DrillWordHighlight & { word: string } | null {
  const occurrences: Array<DrillWordHighlight & { word: string }> = [];

  sentences.forEach((sentence, sentenceIndex) => {
    tokenizeSentence(sentence).forEach((token, tokenIndex) => {
      if (token.kind === 'word') {
        occurrences.push({ sentenceIndex, tokenIndex, word: token.text });
      }
    });
  });

  if (occurrences.length === 0) return null;
  return occurrences[Math.floor(Math.random() * occurrences.length)];
}

export function PracticeView({
  studyLanguage,
  onSave,
  onSpeak,
  onStop,
  speaking,
  loadedText,
  loadKey,
  onDetachLesson,
  onCloseLesson,
  onPracticeSaved,
  onNotice,
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
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const readAllAbortRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    getTranslation,
    isLoading,
    hasError,
    fetchTranslation,
    translateAllText,
    isTranslatingAll,
    isTextFullyTranslated,
    syncFromCache,
  } = useTranslation();

  useEffect(() => {
    if (!loadedText) return;
    setText(loadedText.content);
    setTitle(loadedText.title);
    setActiveLoadedId(loadedText.id);
    setSelectedIndex(null);
    setSelectedWord(null);
    setDrillOccurrence(null);
    setDrillHighlighted(false);
    setSetupCollapsed(true);
    syncFromCache(loadedText.sentences);
  }, [loadedText, loadKey, syncFromCache]);

  const sentences = useMemo(() => splitIntoSentences(text), [text]);
  const fullyTranslated = isTextFullyTranslated(text);

  const handleTranslateAll = async () => {
    const items = speechItems(text);
    const [result, audioCount] = await Promise.all([
      translateAllText(text),
      prefetchSpeech(items),
    ]);

    if (result.ok) {
      onNotice?.(`Traducciones y pronunciación listas (${result.count} ítems, ${audioCount} audios)`);
      return;
    }

    onNotice?.('No se pudo traducir la lección');
  };

  const handleSave = async () => {
    if (!text.trim() || saving) return;

    setSaving(true);
    try {
      const items = speechItems(text);
      const [, audioCount] = await Promise.all([
        translateAllText(text),
        prefetchSpeech(items),
      ]);
      onSave(text, title.trim() || undefined);
      setTitle('');
      onNotice?.(`Guardado con ${audioCount} audios en caché`);
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
    setSetupCollapsed(false);
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
    setTitle('');
    setSetupCollapsed(true);
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
    (index: number) => {
      clearDrill();
      setSelectedIndex(index);
      setSelectedWord(null);
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
    goToSentence(nextIndex);
  }, [goToSentence, selectedIndex, sentences.length]);

  const goNextSentence = useCallback(() => {
    if (sentences.length === 0) return;
    const nextIndex =
      selectedIndex === null ? 0 : Math.min(sentences.length - 1, selectedIndex + 1);
    goToSentence(nextIndex);
  }, [goToSentence, selectedIndex, sentences.length]);

  const pronounceCurrentSentence = useCallback(() => {
    if (sentences.length === 0) return;
    const index = selectedIndex ?? 0;
    speakAtIndex(index);
  }, [selectedIndex, sentences.length, speakAtIndex]);

  const handleRandomWordDrill = useCallback(() => {
    if (sentences.length === 0) return;

    if (drillOccurrence && !drillHighlighted) {
      setDrillHighlighted(true);
      void onSpeak(drillOccurrence.word);
      return;
    }

    const occurrence = pickRandomWordOccurrence(sentences);
    if (!occurrence) return;

    setDrillOccurrence(occurrence);
    setDrillHighlighted(false);
    setSelectedIndex(occurrence.sentenceIndex);
    setSelectedWord(null);
    if (activeLoadedId) onPracticeSaved?.(activeLoadedId);
    void onSpeak(occurrence.word);
  }, [activeLoadedId, drillHighlighted, drillOccurrence, onPracticeSaved, onSpeak, sentences]);

  const handleSelectWord = useCallback(
    (word: string) => {
      clearDrill();
      setSelectedWord(word);
    },
    [clearDrill],
  );

  const drillHighlight = drillHighlighted && drillOccurrence
    ? { sentenceIndex: drillOccurrence.sentenceIndex, tokenIndex: drillOccurrence.tokenIndex }
    : null;

  const lessonLabel = title.trim() || (sentences[0]?.slice(0, 48) ?? 'Lección');

  useEffect(() => {
    if (sentences.length === 0) {
      setSetupCollapsed(false);
    }
  }, [sentences.length]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || sentences.length === 0) return;

    const handleScroll = () => {
      if (scrollEl.scrollTop > 24) {
        setSetupCollapsed(true);
      }
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [sentences.length]);

  useEffect(() => {
    if (!drillHighlight) return;
    document
      .querySelector(`[data-word-ref="${drillHighlight.sentenceIndex}-${drillHighlight.tokenIndex}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [drillHighlight]);

  useEffect(() => {
    if (selectedIndex === null) return;
    document
      .querySelector(`[data-sentence-index="${selectedIndex}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (sentences.length === 0) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'TEXTAREA' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        goNextSentence();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        goPreviousSentence();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleRandomWordDrill();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        pronounceCurrentSentence();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNextSentence, goPreviousSentence, handleRandomWordDrill, pronounceCurrentSentence, sentences.length]);

  return (
    <div className="practice-view">
      {sentences.length > 0 && setupCollapsed && (
        <button
          type="button"
          className="practice-setup-bar"
          onClick={() => setSetupCollapsed(false)}
          aria-expanded={false}
        >
          <span className="practice-setup-bar__title">{lessonLabel}</span>
          <span className="practice-setup-bar__meta">{sentences.length} oraciones</span>
          <span className="practice-setup-bar__action">Editar lección</span>
        </button>
      )}

      <div
        className={`practice-view__setup${setupCollapsed && sentences.length > 0 ? ' practice-view__setup--collapsed' : ''}`}
      >
        <TextInput
          placeholder={langConfig.textPlaceholder}
          title={title}
          onTitleChange={setTitle}
          value={text}
          onChange={(value) => {
            if (activeLoadedId) {
              onDetachLesson?.();
            }
            setText(value);
            setActiveLoadedId(null);
            setSelectedIndex(null);
            setSelectedWord(null);
            setDrillOccurrence(null);
            setDrillHighlighted(false);
          }}
          onSave={handleSave}
          onCloseLesson={handleCloseLesson}
          isLoadedLesson={Boolean(activeLoadedId)}
          onTranslate={handleTranslateAll}
          onLoadSample={handleLoadSample}
          canSave={text.trim().length > 0}
          canTranslate={text.trim().length > 0}
          translating={isTranslatingAll}
          translated={fullyTranslated}
          saving={saving}
        />

        {sentences.length > 0 && (
          <div className="practice-toolbar">
            {readingAll ? (
              <button
                type="button"
                className="btn btn--danger btn--block"
                onClick={handleStopReadAll}
              >
                ■ Detener lectura
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--secondary btn--block"
                onClick={handleReadAll}
                disabled={speaking}
              >
                ▶ Leer toda la lección
              </button>
            )}
          </div>
        )}

        {sentences.length > 0 && !setupCollapsed && (
          <button
            type="button"
            className="practice-setup-collapse"
            onClick={() => setSetupCollapsed(true)}
          >
            Mostrar oraciones
          </button>
        )}
      </div>

      <div className="practice-view__body">
        {sentences.length > 0 && (
          <div className="practice-view__sentence-tools">
            <SpeechSpeedControl
              value={speechSpeed}
              onChange={onSpeechSpeedChange}
              disabled={speaking || readingAll}
            />
          </div>
        )}

        <div ref={scrollRef} className="practice-view__scroll">
          <SentenceList
            key={text}
            sentences={sentences}
            selectedIndex={selectedIndex}
            speakingIndex={speakingSentenceIndex}
            selectedWord={selectedWord}
            drillHighlight={drillHighlight}
            getTranslation={getTranslation}
            isTranslationLoading={isLoading}
            hasTranslationError={hasError}
            fetchTranslation={fetchTranslation}
            onSelectSentence={(index) => {
              goToSentence(index);
            }}
            onSelectWord={handleSelectWord}
            onSpeakSentence={speakAtIndex}
          />
        </div>

        {sentences.length > 0 && (
          <SentenceNavPanel
            selectedIndex={selectedIndex}
            total={sentences.length}
            speaking={speaking && speakingSentenceIndex !== null}
            onRandomWord={handleRandomWordDrill}
            onPrevious={goPreviousSentence}
            onNext={goNextSentence}
            onSpeak={pronounceCurrentSentence}
          />
        )}
      </div>

      <WordPanelContainer
        word={selectedWord}
        getTranslation={getTranslation}
        isTranslationLoading={isLoading}
        hasTranslationError={hasError}
        fetchTranslation={fetchTranslation}
        onClose={() => setSelectedWord(null)}
        onSpeak={onSpeak}
        onStop={onStop}
        speaking={speaking}
      />
    </div>
  );
}
