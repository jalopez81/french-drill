import { useEffect, useMemo, useRef, useState } from 'react';
import type { FlashcardRating, VocabEntry } from '../types';
import { formatNextReview } from '../utils/spacedRepetition';
import { FlashcardSummary } from './FlashcardSummary';

interface FlashcardsViewProps {
  flashcardLangLabel: string;
  vocabulary: VocabEntry[];
  dueCount: number;
  totalCount: number;
  sessionDone: number;
  remainingInSession: number;
  currentCard: VocabEntry | null;
  revealed: boolean;
  sessionComplete: boolean;
  hasDeck: boolean;
  speaking: boolean;
  onReveal: () => void;
  onRate: (rating: FlashcardRating) => void;
  onSpeak: (word: string) => void;
  onSaveTranslation: (word: string, translation: string) => void;
  onRefetchTranslation: (word: string) => Promise<string | null>;
  onRestart: () => void;
  onStudyAll: () => void;
}

const ratings: { id: FlashcardRating; label: string; className: string }[] = [
  { id: 'again', label: 'Otra vez', className: 'flashcard-rate--again' },
  { id: 'hard', label: 'Difícil', className: 'flashcard-rate--hard' },
  { id: 'good', label: 'Bien', className: 'flashcard-rate--good' },
  { id: 'easy', label: 'Fácil', className: 'flashcard-rate--easy' },
];

export function FlashcardsView({
  flashcardLangLabel,
  vocabulary,
  dueCount,
  totalCount,
  sessionDone,
  remainingInSession,
  currentCard,
  revealed,
  sessionComplete,
  hasDeck,
  speaking,
  onReveal,
  onRate,
  onSpeak,
  onSaveTranslation,
  onRefetchTranslation,
  onRestart,
  onStudyAll,
}: FlashcardsViewProps) {
  const withoutTranslation = vocabulary.length - totalCount;
  const onSpeakRef = useRef(onSpeak);
  const [draftTranslation, setDraftTranslation] = useState('');
  const [refetching, setRefetching] = useState(false);

  onSpeakRef.current = onSpeak;

  const liveCard = useMemo(() => {
    if (!currentCard) return null;
    return vocabulary.find((entry) => entry.id === currentCard.id) ?? currentCard;
  }, [currentCard, vocabulary]);

  useEffect(() => {
    if (!currentCard) return;
    void onSpeakRef.current(currentCard.word);
  }, [currentCard?.id]);

  useEffect(() => {
    setDraftTranslation(liveCard?.translation ?? '');
  }, [liveCard?.id, liveCard?.translation]);

  const canSave =
    Boolean(liveCard) &&
    draftTranslation.trim().length > 0 &&
    draftTranslation.trim() !== (liveCard?.translation ?? '').trim();

  if (!hasDeck) {
    return (
      <div className="flashcards-view">
        <h2 className="section-title">Memoria</h2>
        <div className="empty-state">
          <p>Guarda lecciones y tradúcelas para practicar en Memoria.</p>
        </div>
      </div>
    );
  }

  const header = (
    <>
      <div className="flashcards-header">
        <h2 className="section-title">Memoria</h2>
        <p className="flashcards-header__meta">{totalCount} palabras en memoria</p>
      </div>
      <FlashcardSummary vocabulary={vocabulary} />
    </>
  );

  if (sessionComplete) {
    return (
      <div className="flashcards-view">
        {header}
        <section className="card flashcard-done">
          <p className="flashcard-done__title">Sesión completada</p>
          <p className="flashcard-done__text">
            Repasaste {sessionDone} palabra{sessionDone === 1 ? '' : 's'} en memoria.
          </p>
          {dueCount === 0 ? (
            <p className="hint">No hay nada pendiente en memoria por ahora.</p>
          ) : (
            <p className="hint">Quedan {dueCount} palabras para repasar en memoria hoy.</p>
          )}
          <button type="button" className="btn btn--primary btn--block" onClick={onRestart}>
            Repasar de nuevo
          </button>
        </section>
      </div>
    );
  }

  if (!currentCard || !liveCard) {
    return (
      <div className="flashcards-view">
        {header}
        <section className="card flashcard-done">
          <p className="flashcard-done__title">¡Todo al día!</p>
          <p className="hint">No hay nada pendiente en memoria. Vuelve más tarde.</p>
          <button type="button" className="btn btn--secondary btn--block" onClick={onStudyAll}>
            Revisar de todos modos
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="flashcards-view">
      {header}

      <p className="flashcards-header__meta flashcards-header__meta--session">
        {dueCount} pendientes · {remainingInSession} en sesión
      </p>

      {withoutTranslation > 0 && (
        <p className="hint">
          {withoutTranslation} palabra{withoutTranslation === 1 ? '' : 's'} sin traducción no{' '}
          {withoutTranslation === 1 ? 'está' : 'están'} en memoria.
        </p>
      )}

      <article
        className={`flashcard ${revealed ? 'flashcard--revealed' : ''}`}
        onClick={() => {
          if (!revealed) onReveal();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!revealed && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onReveal();
          }
        }}
      >
        <div className="flashcard__top">
          <span className="pill pill--blue">{flashcardLangLabel}</span>
          <button
            type="button"
            className="btn btn--primary btn--icon"
            onClick={(e) => {
              e.stopPropagation();
              onSpeak(liveCard.word);
            }}
            disabled={speaking}
            aria-label={`Pronunciar ${liveCard.word}`}
          >
            ▶
          </button>
        </div>

        <p className="flashcard__word">{liveCard.word}</p>

        {revealed ? (
          <div
            className="flashcard__answer-edit"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <label className="field field--compact">
              <span className="field__label">Traducción</span>
              <input
                type="text"
                className="title-input"
                value={draftTranslation}
                onChange={(e) => setDraftTranslation(e.target.value)}
                disabled={refetching}
              />
            </label>
            <div className="btn-row flashcard__translation-actions">
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={!canSave}
                onClick={() => onSaveTranslation(liveCard.word, draftTranslation)}
              >
                Guardar
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={refetching}
                onClick={() => {
                  setRefetching(true);
                  void onRefetchTranslation(liveCard.word)
                    .then((translation) => {
                      if (translation) setDraftTranslation(translation);
                    })
                    .finally(() => setRefetching(false));
                }}
              >
                {refetching ? 'Traduciendo…' : 'Traducir de nuevo'}
              </button>
            </div>
          </div>
        ) : (
          <p className="flashcard__hint">Toca para ver la respuesta</p>
        )}

        {liveCard.srs && (
          <p className="flashcard__srs">
            Próxima revisión: {formatNextReview(liveCard.srs.nextReview)}
          </p>
        )}
      </article>

      {revealed && (
        <div className="flashcard-ratings">
          {ratings.map((rating) => (
            <button
              key={rating.id}
              type="button"
              className={`flashcard-rate ${rating.className}`}
              onClick={() => onRate(rating.id)}
            >
              {rating.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
