import { tokenizeSentence } from '../utils/tokenize';
import { EyeButton } from './EyeButton';

interface SentenceCardProps {
  sentence: string;
  index: number;
  isSelected: boolean;
  isSpeaking: boolean;
  selectedWord: string | null;
  showTranslation: boolean;
  translation: string | null;
  translationLoading: boolean;
  translationError: boolean;
  onToggleTranslation: () => void;
  onSelectSentence: () => void;
  onSelectWord: (word: string) => void;
}

export function SentenceCard({
  sentence,
  index,
  isSelected,
  isSpeaking,
  selectedWord,
  showTranslation,
  translation,
  translationLoading,
  translationError,
  onToggleTranslation,
  onSelectSentence,
  onSelectWord,
}: SentenceCardProps) {
  const tokens = tokenizeSentence(sentence);

  return (
    <article
      className={`sentence-card ${isSelected ? 'sentence-card--selected' : ''} ${isSpeaking ? 'sentence-card--speaking' : ''}`}
      onClick={onSelectSentence}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectSentence();
        }
      }}
      aria-pressed={isSelected}
    >
      <span className="sentence-card__index">{index + 1}</span>

      <div className="sentence-card__body">
        <p className="sentence-card__text">
          {tokens.map((token, i) =>
            token.kind === 'word' ? (
              <button
                key={`${i}-${token.text}`}
                type="button"
                className={`word-btn ${!isSelected ? 'word-btn--inactive' : ''} ${selectedWord === token.text && isSelected ? 'word-btn--active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isSelected) {
                    onSelectSentence();
                    return;
                  }
                  onSelectWord(token.text);
                }}
              >
                {token.text}
              </button>
            ) : (
              <span key={`${i}-${token.text}`}>{token.text}</span>
            ),
          )}
        </p>

        {showTranslation && (
          <p className="sentence-card__translation">
            {translationLoading && 'Traduciendo…'}
            {!translationLoading && translationError && 'No se pudo traducir'}
            {!translationLoading && !translationError && translation}
          </p>
        )}
      </div>

      <EyeButton
        active={showTranslation}
        onClick={onToggleTranslation}
        label={showTranslation ? 'Ocultar traducción' : 'Mostrar traducción'}
      />
    </article>
  );
}
