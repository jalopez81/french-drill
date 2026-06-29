import { useEffect } from 'react';

interface WordPanelProps {
  word: string | null;
  translation: string | null;
  translationLoading: boolean;
  translationError: boolean;
  onClose: () => void;
  onSpeak: (text: string) => void;
  onStop: () => void;
  speaking: boolean;
}

export function WordPanel({
  word,
  translation,
  translationLoading,
  translationError,
  onClose,
  onSpeak,
  onStop,
  speaking,
}: WordPanelProps) {
  if (!word) return null;

  return (
    <>
      <button type="button" className="sheet-backdrop" onClick={onClose} aria-label="Cerrar panel" />
      <div className="word-panel" role="dialog" aria-label="Detalle de palabra">
        <div className="word-panel__handle" aria-hidden />
        <div className="word-panel__header">
          <span className="pill pill--purple">Palabra</span>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <p className="word-panel__word">{word}</p>
        <p className="word-panel__translation">
          {translationLoading && 'Traduciendo…'}
          {!translationLoading && translationError && 'No se pudo traducir'}
          {!translationLoading && !translationError && translation}
        </p>
        <button
          type="button"
          className={`btn btn--block ${speaking ? 'btn--danger' : 'btn--primary'}`}
          onClick={() => {
            if (speaking) {
              onStop();
              return;
            }
            onSpeak(word);
          }}
        >
          {speaking ? '■ Detener' : '▶ Pronunciar palabra'}
        </button>
      </div>
    </>
  );
}

export function WordPanelContainer({
  word,
  getTranslation,
  isTranslationLoading,
  hasTranslationError,
  fetchTranslation,
  onClose,
  onSpeak,
  onStop,
  speaking,
}: {
  word: string | null;
  getTranslation: (text: string) => string | null;
  isTranslationLoading: (text: string) => boolean;
  hasTranslationError: (text: string) => boolean;
  fetchTranslation: (text: string) => void;
  onClose: () => void;
  onSpeak: (text: string) => void;
  onStop: () => void;
  speaking: boolean;
}) {
  useEffect(() => {
    if (!word) return;
    fetchTranslation(word);
  }, [word, fetchTranslation]);

  return (
    <WordPanel
      word={word}
      translation={word ? getTranslation(word) : null}
      translationLoading={word ? isTranslationLoading(word) : false}
      translationError={word ? hasTranslationError(word) : false}
      onClose={onClose}
      onSpeak={onSpeak}
      onStop={onStop}
      speaking={speaking}
    />
  );
}
