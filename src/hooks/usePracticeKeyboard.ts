import { useEffect } from 'react';

interface UsePracticeKeyboardOptions {
  sentencesLength: number;
  goNextSentence: () => void;
  goPreviousSentence: () => void;
  handleRandomWordDrill: () => void;
  pronounceCurrentSentence: () => void;
}

export function usePracticeKeyboard({
  sentencesLength,
  goNextSentence,
  goPreviousSentence,
  handleRandomWordDrill,
  pronounceCurrentSentence,
}: UsePracticeKeyboardOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (sentencesLength === 0) return;

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
  }, [
    goNextSentence,
    goPreviousSentence,
    handleRandomWordDrill,
    pronounceCurrentSentence,
    sentencesLength,
  ]);
}
