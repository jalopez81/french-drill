import { useEffect, useMemo, useRef, useState } from 'react';
import type { FlashcardRating, VocabEntry } from '../types';
import { formatNextReview } from '../utils/spacedRepetition';
import { getVocabKind, vocabKindLabel, vocabKindPillClass } from '../utils/vocabKind';
import { FlashcardSummary } from './FlashcardSummary';
import { VocabKindPeek } from './VocabKindPeek';
import type { FlashcardCategory } from '../types';
import { ProgressBar } from './ProgressBar';

interface FlashcardsViewProps {
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
  onCategoryClick: (category: FlashcardCategory) => void;
}

const ratings: { id: FlashcardRating; label: string; className: string; key: string }[] = [
  { id: 'again', label: 'Otra vez', className: 'flashcard-rate--again', key: '1' },
  { id: 'hard', label: 'Difícil', className: 'flashcard-rate--hard', key: '2' },
  { id: 'good', label: 'Bien', className: 'flashcard-rate--good', key: '3' },
  { id: 'easy', label: 'Fácil', className: 'flashcard-rate--easy', key: '4' },
];

const SWIPE_THRESHOLD = 72;
const SWIPE_EXIT_MS = 260;

export function FlashcardsView({
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
  onCategoryClick,
}: FlashcardsViewProps) {
  const withoutTranslation = vocabulary.length - totalCount;
  const onSpeakRef = useRef(onSpeak);
  const onRateRef = useRef(onRate);
  const [draftTranslation, setDraftTranslation] = useState('');
  const [refetching, setRefetching] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [swipeHint, setSwipeHint] = useState<'left' | 'right' | null>(null);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const lastAutoSpeakRef = useRef<{ id: string; at: number } | null>(null);

  onSpeakRef.current = onSpeak;
  onRateRef.current = onRate;

  const liveCard = useMemo(() => {
    if (!currentCard) return null;
    return vocabulary.find((entry) => entry.id === currentCard.id) ?? currentCard;
  }, [currentCard, vocabulary]);

  useEffect(() => {
    if (!currentCard) return;
    const now = Date.now();
    const last = lastAutoSpeakRef.current;
    if (last?.id === currentCard.id && now - last.at < 800) return;
    lastAutoSpeakRef.current = { id: currentCard.id, at: now };
    void onSpeakRef.current(currentCard.word);
  }, [currentCard?.id]);

  useEffect(() => {
    setDraftTranslation(liveCard?.translation ?? '');
  }, [liveCard?.id, liveCard?.translation]);

  useEffect(() => {
    setDragOffset(0);
    setSwipeHint(null);
    setExitDirection(null);
    setIsDragging(false);
    touchStartRef.current = null;
  }, [currentCard?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentCard || sessionComplete) return;

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

      if (event.key === ' ' || event.key === 'Enter') {
        if (!revealed) {
          event.preventDefault();
          onReveal();
        }
        return;
      }

      if (!revealed) return;

      const ratingByKey = ratings.find((rating) => rating.key === event.key);
      if (ratingByKey) {
        event.preventDefault();
        onRate(ratingByKey.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCard, onRate, onReveal, revealed, sessionComplete]);

  const canSave =
    Boolean(liveCard) &&
    draftTranslation.trim().length > 0 &&
    draftTranslation.trim() !== (liveCard?.translation ?? '').trim();

  const swipeIntensity = Math.min(Math.abs(dragOffset) / SWIPE_THRESHOLD, 1);
  const sessionTotal = sessionDone + remainingInSession;

  const completeSwipe = (direction: 'left' | 'right') => {
    setExitDirection(direction);
    window.setTimeout(() => {
      onRateRef.current(direction === 'left' ? 'again' : 'good');
      setExitDirection(null);
      setDragOffset(0);
      setSwipeHint(null);
      setIsDragging(false);
    }, SWIPE_EXIT_MS);
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    if (!revealed || exitDirection) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsDragging(false);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!revealed || !touchStartRef.current || exitDirection) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (!isDragging && Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12) return;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    setIsDragging(true);
    setDragOffset(deltaX);
    setSwipeHint(deltaX < 0 ? 'left' : 'right');
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!revealed || !touchStartRef.current || exitDirection) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (isDragging && Math.abs(deltaX) >= SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
      completeSwipe(deltaX < 0 ? 'left' : 'right');
      return;
    }

    setDragOffset(0);
    setSwipeHint(null);
    setIsDragging(false);
  };

  const cardTransform =
    exitDirection === 'left'
      ? 'translateX(-120%) rotate(-12deg)'
      : exitDirection === 'right'
        ? 'translateX(120%) rotate(12deg)'
        : `translateX(${dragOffset}px) rotate(${dragOffset * 0.04}deg)`;

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
      <div className="flashcards-header flashcards-header--compact">
        <h2 className="section-title flashcards-header__title">Memoria</h2>
        <span className="flashcards-header__meta">
          {dueCount} pend. · {totalCount} en memoria
        </span>
      </div>
      <FlashcardSummary vocabulary={vocabulary} onCategoryClick={onCategoryClick} />
      <VocabKindPeek vocabulary={vocabulary} className="vocab-kind-peek--flashcards" />
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
        Sesión · {remainingInSession} restantes
      </p>

      {sessionTotal > 0 && (
        <ProgressBar
          value={sessionDone}
          max={sessionTotal}
          label={`Sesión: ${sessionDone}/${sessionTotal}`}
          showPercent
          size="sm"
          className="flashcards-session-progress"
        />
      )}

      {withoutTranslation > 0 && (
        <p className="hint">
          {withoutTranslation} palabra{withoutTranslation === 1 ? '' : 's'} sin traducción no{' '}
          {withoutTranslation === 1 ? 'está' : 'están'} en memoria.
        </p>
      )}

      <div className="flashcard-swipe-zone">
        <div
          className={`flashcard-swipe-overlay flashcard-swipe-overlay--left${swipeHint === 'left' ? ' flashcard-swipe-overlay--active' : ''}`}
          style={{ opacity: swipeHint === 'left' ? swipeIntensity : undefined }}
          aria-hidden
        >
          <span className="flashcard-swipe-overlay__label">Otra vez</span>
        </div>
        <div
          className={`flashcard-swipe-overlay flashcard-swipe-overlay--right${swipeHint === 'right' ? ' flashcard-swipe-overlay--active' : ''}`}
          style={{ opacity: swipeHint === 'right' ? swipeIntensity : undefined }}
          aria-hidden
        >
          <span className="flashcard-swipe-overlay__label">Bien</span>
        </div>

        <article
          className={`flashcard ${revealed ? 'flashcard--revealed' : ''}${isDragging ? ' flashcard--dragging' : ''}${exitDirection ? ` flashcard--exit-${exitDirection}` : ''}`}
          style={{ transform: cardTransform }}
          onClick={() => {
            if (isDragging || exitDirection) return;
            if (!revealed) onReveal();
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
            <span className={vocabKindPillClass(getVocabKind(liveCard))}>
              {vocabKindLabel(getVocabKind(liveCard))}
            </span>
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
      </div>

      {revealed && (
        <>
          <div className="flashcard-swipe-guide" aria-hidden>
            <span className="flashcard-swipe-guide__side flashcard-swipe-guide__side--left">
              ← Desliza · Otra vez
            </span>
            <span className="flashcard-swipe-guide__side flashcard-swipe-guide__side--right">
              Bien · Desliza →
            </span>
          </div>

          <div className="flashcard-ratings">
            {ratings.map((rating) => (
              <button
                key={rating.id}
                type="button"
                className={`flashcard-rate ${rating.className}`}
                onClick={() => onRate(rating.id)}
              >
                {rating.key} · {rating.label}
              </button>
            ))}
          </div>
        </>
      )}

      {!revealed && (
        <p className="hint flashcards-hint">Espacio para revelar · 1–4 para calificar</p>
      )}
    </div>
  );
}
