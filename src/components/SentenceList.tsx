import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';
import { SentenceCard, type DrillWordHighlight } from './SentenceCard';

export interface SentenceListHandle {
  scrollToSentence: (index: number) => void;
  scrollToWord: (sentenceIndex: number, tokenIndex: number) => void;
}

interface SentenceListProps {
  sentences: string[];
  selectedIndex: number | null;
  speakingIndex: number | null;
  selectedWord: string | null;
  drillHighlight: DrillWordHighlight | null;
  focusMode?: boolean;
  getTranslation: (text: string) => string | null;
  isTranslationLoading: (text: string) => boolean;
  hasTranslationError: (text: string) => boolean;
  fetchTranslation: (text: string) => void;
  onSpeakSentence: (index: number) => void;
  onSelectSentence: (index: number) => void;
  onSelectWord: (word: string) => void;
  ref?: Ref<SentenceListHandle>;
}

function SentenceListInner(
  {
    sentences,
    selectedIndex,
    speakingIndex,
    selectedWord,
    drillHighlight,
    focusMode = false,
    getTranslation,
    isTranslationLoading,
    hasTranslationError,
    fetchTranslation,
    onSpeakSentence,
    onSelectSentence,
    onSelectWord,
  }: Omit<SentenceListProps, 'ref'>,
  ref: Ref<SentenceListHandle>,
) {
  const [visibleTranslations, setVisibleTranslations] = useState<Set<number>>(new Set());
  const sentenceRefs = useRef<Map<number, HTMLElement>>(new Map());
  const wordRefs = useRef<Map<string, HTMLElement>>(new Map());

  const scrollToSentence = useCallback((index: number) => {
    sentenceRefs.current.get(index)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  const scrollToWord = useCallback((sentenceIndex: number, tokenIndex: number) => {
    wordRefs.current
      .get(`${sentenceIndex}-${tokenIndex}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  useImperativeHandle(ref, () => ({ scrollToSentence, scrollToWord }), [
    scrollToSentence,
    scrollToWord,
  ]);

  if (sentences.length === 0) {
    return (
      <div className="empty-state">
        <p>Pega una lección para ver las oraciones divididas.</p>
      </div>
    );
  }

  const toggleTranslation = (index: number, sentence: string) => {
    const isVisible = visibleTranslations.has(index);

    if (isVisible) {
      setVisibleTranslations((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      return;
    }

    fetchTranslation(sentence);
    setVisibleTranslations((prev) => new Set(prev).add(index));
  };

  const focusIndex = focusMode ? (selectedIndex ?? 0) : null;

  if (focusMode && focusIndex !== null) {
    const sentence = sentences[focusIndex];
    const showTranslation = visibleTranslations.has(focusIndex);

    return (
      <section className="sentence-list sentence-list--focus">
        <SentenceCard
          key={`focus-${focusIndex}-${sentence.slice(0, 24)}`}
          sentence={sentence}
          index={focusIndex}
          isSelected
          isSpeaking={speakingIndex === focusIndex}
          selectedWord={selectedWord}
          drillHighlight={drillHighlight}
          showTranslation={showTranslation}
          translation={getTranslation(sentence)}
          translationLoading={showTranslation && isTranslationLoading(sentence)}
          translationError={showTranslation && hasTranslationError(sentence)}
          onToggleTranslation={() => toggleTranslation(focusIndex, sentence)}
          onSpeakSentence={() => onSpeakSentence(focusIndex)}
          onSelectSentence={() => onSelectSentence(focusIndex)}
          onSelectWord={onSelectWord}
          focusMode
          sentenceRef={(element) => {
            if (element) sentenceRefs.current.set(focusIndex, element);
            else sentenceRefs.current.delete(focusIndex);
          }}
          wordRef={(tokenIndex, element) => {
            const key = `${focusIndex}-${tokenIndex}`;
            if (element) wordRefs.current.set(key, element);
            else wordRefs.current.delete(key);
          }}
        />
        <p className="sentence-swipe-hint">↑ anterior · ↓ siguiente</p>
      </section>
    );
  }

  return (
    <section className="sentence-list">
      <h2 className="section-title sentence-list__title">Oraciones ({sentences.length})</h2>
      {sentences.map((sentence, index) => {
        const showTranslation = visibleTranslations.has(index);

        return (
          <SentenceCard
            key={`${index}-${sentence.slice(0, 24)}`}
            sentence={sentence}
            index={index}
            isSelected={selectedIndex === index}
            isSpeaking={speakingIndex === index}
            selectedWord={selectedWord}
            drillHighlight={drillHighlight}
            showTranslation={showTranslation}
            translation={getTranslation(sentence)}
            translationLoading={showTranslation && isTranslationLoading(sentence)}
            translationError={showTranslation && hasTranslationError(sentence)}
            onToggleTranslation={() => toggleTranslation(index, sentence)}
            onSpeakSentence={() => onSpeakSentence(index)}
            onSelectSentence={() => onSelectSentence(index)}
            onSelectWord={onSelectWord}
            sentenceRef={(element) => {
              if (element) sentenceRefs.current.set(index, element);
              else sentenceRefs.current.delete(index);
            }}
            wordRef={(tokenIndex, element) => {
              const key = `${index}-${tokenIndex}`;
              if (element) wordRefs.current.set(key, element);
              else wordRefs.current.delete(key);
            }}
          />
        );
      })}
    </section>
  );
}

export const SentenceList = forwardRef(SentenceListInner);
