import { tokenizeSentence } from '../utils/tokenize';
import { tokenMatchesTarget } from '../utils/flashcardContext';

interface FlashcardContextLineProps {
  sentence: string;
  targetNormalized: string;
  highlightPhrase?: boolean;
}

function phraseWordCount(normalized: string): number {
  return normalized.split(/\s+/).filter(Boolean).length;
}

function isHighlightedTokenRun(
  tokens: ReturnType<typeof tokenizeSentence>,
  start: number,
  targetNormalized: string,
): boolean {
  const targetWords = targetNormalized.split(/\s+/).filter(Boolean);
  if (targetWords.length === 0) return false;

  let ti = 0;
  for (let i = start; i < tokens.length && ti < targetWords.length; i += 1) {
    const token = tokens[i];
    if (token.kind !== 'word') continue;
    if (!tokenMatchesTarget(token.text, targetWords[ti])) return false;
    ti += 1;
  }

  return ti === targetWords.length;
}

export function FlashcardContextLine({
  sentence,
  targetNormalized,
  highlightPhrase = false,
}: FlashcardContextLineProps) {
  const tokens = tokenizeSentence(sentence);
  const highlighted = new Set<number>();

  if (highlightPhrase && phraseWordCount(targetNormalized) > 1) {
    for (let i = 0; i < tokens.length; i += 1) {
      if (tokens[i].kind !== 'word') continue;
      if (isHighlightedTokenRun(tokens, i, targetNormalized)) {
        let remaining = phraseWordCount(targetNormalized);
        for (let j = i; j < tokens.length && remaining > 0; j += 1) {
          if (tokens[j].kind === 'word') {
            highlighted.add(j);
            remaining -= 1;
          }
        }
        break;
      }
    }
  } else {
    tokens.forEach((token, index) => {
      if (token.kind === 'word' && tokenMatchesTarget(token.text, targetNormalized)) {
        highlighted.add(index);
      }
    });
  }

  return (
    <p className="flashcard__context">
      {tokens.map((token, index) =>
        highlighted.has(index) ? (
          <span key={`${index}-${token.text}`} className="flashcard__context-word">
            {token.text}
          </span>
        ) : (
          <span key={`${index}-${token.text}`}>{token.text}</span>
        ),
      )}
    </p>
  );
}
