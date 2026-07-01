import { useEffect, useRef } from 'react';
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
  onRestart,
  onStudyAll,
}: FlashcardsViewProps) {
  const withoutTranslation = vocabulary.length - totalCount;
  const onSpeakRef = useRef(onSpeak);
  onSpeakRef.current = onSpeak;

  useEffect(() => {
    if (!currentCard) return;
    void onSpeakRef.current(currentCard.word);
  }, [currentCard?.id]);

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

  if (!currentCard) {
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
              onSpeak(currentCard.word);
            }}
            disabled={speaking}
            aria-label={`Pronunciar ${currentCard.word}`}
          >
            ▶
          </button>
        </div>

        <p className="flashcard__word">{currentCard.word}</p>

        {revealed ? (
          <p className="flashcard__answer">{currentCard.translation}</p>
        ) : (
          <p className="flashcard__hint">Toca para ver la respuesta</p>
        )}

        {currentCard.srs && (
          <p className="flashcard__srs">
            Próxima revisión: {formatNextReview(currentCard.srs.nextReview)}
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
