import { useState } from 'react';
import { SentenceCard, type DrillWordHighlight } from './SentenceCard';

interface SentenceListProps {
  sentences: string[];
  selectedIndex: number | null;
  speakingIndex: number | null;
  selectedWord: string | null;
  drillHighlight: DrillWordHighlight | null;
  getTranslation: (text: string) => string | null;
  isTranslationLoading: (text: string) => boolean;
  hasTranslationError: (text: string) => boolean;
  fetchTranslation: (text: string) => void;
  onSpeakSentence: (index: number) => void;
  onSelectSentence: (index: number) => void;
  onSelectWord: (word: string) => void;
}

export function SentenceList({
  sentences,
  selectedIndex,
  speakingIndex,
  selectedWord,
  drillHighlight,
  getTranslation,
  isTranslationLoading,
  hasTranslationError,
  fetchTranslation,
  onSpeakSentence,
  onSelectSentence,
  onSelectWord,
}: SentenceListProps) {
  const [visibleTranslations, setVisibleTranslations] = useState<Set<number>>(new Set());

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

  return (
    <section className="sentence-list">
      <h2 className="section-title">Oraciones ({sentences.length})</h2>
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
          />
        );
      })}
    </section>
  );
}
