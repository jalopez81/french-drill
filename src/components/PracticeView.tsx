import { useEffect, useMemo, useRef, useState } from 'react';
import type { SavedText } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { splitIntoSentences } from '../utils/sentenceSplitter';
import { uniqueWords } from '../utils/wordExtractor';
import type { StudyLanguage } from '../config/languages';
import { LANGUAGES } from '../config/languages';
import { SAMPLE_B1_EN_TEXT, SAMPLE_B1_TEXT } from '../data/sampleB1Text';
import { TextInput } from './TextInput';
import { SentenceList } from './SentenceList';
import { SpeechSpeedControl } from './SpeechSpeedControl';
import { WordPanelContainer } from './WordPanel';
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
  const [readingAll, setReadingAll] = useState(false);
  const [speakingSentenceIndex, setSpeakingSentenceIndex] = useState<number | null>(null);
  const readAllAbortRef = useRef(false);
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
    syncFromCache(loadedText.sentences);
  }, [loadedText, loadKey, syncFromCache]);

  const sentences = useMemo(() => splitIntoSentences(text), [text]);
  const selectedSentence = selectedIndex !== null ? sentences[selectedIndex] : null;
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
    if (!text.trim()) return;
    const items = speechItems(text);
    const audioCount = await prefetchSpeech(items);
    onSave(text, title.trim() || undefined);
    setTitle('');
    onNotice?.(`Guardado con ${audioCount} audios en caché`);
  };

  const handleCloseLesson = () => {
    setText('');
    setTitle('');
    setActiveLoadedId(null);
    setSelectedIndex(null);
    setSelectedWord(null);
    onCloseLesson?.();
  };

  const langConfig = LANGUAGES[studyLanguage];

  const handleLoadSample = () => {
    onDetachLesson?.();
    setText(studyLanguage === 'en' ? SAMPLE_B1_EN_TEXT : SAMPLE_B1_TEXT);
    setActiveLoadedId(null);
    setSelectedIndex(null);
    setSelectedWord(null);
    setTitle('');
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

  const handleSpeakSentence = () => {
    if (!selectedSentence || selectedIndex === null) return;

    if (speaking) {
      onStop();
      setSpeakingSentenceIndex(null);
      return;
    }

    setSpeakingSentenceIndex(selectedIndex);
    void onSpeak(selectedSentence).finally(() => {
      setSpeakingSentenceIndex(null);
    });
  };

  return (
    <div className="practice-view">
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
      />

      {activeLoadedId && <div className="banner banner--info">Práctica de lección guardada</div>}

      {sentences.length > 0 && (
        <div className="practice-toolbar">
          <SpeechSpeedControl
            value={speechSpeed}
            onChange={onSpeechSpeedChange}
            disabled={speaking || readingAll}
          />
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

      <SentenceList
        key={text}
        sentences={sentences}
        selectedIndex={selectedIndex}
        speakingIndex={speakingSentenceIndex}
        selectedWord={selectedWord}
        getTranslation={getTranslation}
        isTranslationLoading={isLoading}
        hasTranslationError={hasError}
        fetchTranslation={fetchTranslation}
        onSelectSentence={(index) => {
          setSelectedIndex(index);
          setSelectedWord(null);
          if (activeLoadedId) onPracticeSaved?.(activeLoadedId);
        }}
        onSelectWord={setSelectedWord}
      />

      {selectedSentence && (
        <div className="action-bar">
          <button
            type="button"
            className={`btn btn--block ${speaking ? 'btn--danger' : 'btn--primary'}`}
            onClick={handleSpeakSentence}
          >
            {speaking ? '■ Detener' : '▶ Pronunciar oración'}
          </button>
        </div>
      )}

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
