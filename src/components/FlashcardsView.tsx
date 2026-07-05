import { useEffect, useMemo, useRef, useState } from 'react';
import type { FlashcardRating, SavedText, VocabEntry } from '../types';
import type { UpcomingReviewGroup } from '../utils/spacedRepetition';
import { getVocabKind, vocabKindLabel, vocabKindPillClass } from '../utils/vocabKind';
import { FlashcardSummary } from './FlashcardSummary';
import { UpcomingReviews } from './UpcomingReviews';
import type { FlashcardCategory } from '../types';
import { ProgressBar } from './ProgressBar';
import { findFlashcardContext } from '../utils/flashcardContext';
import { FlashcardContextLine } from './FlashcardContextLine';
import { normalizePhrase } from '../utils/wordExtractor';

interface FlashcardsViewProps {
  vocabulary: VocabEntry[];
  savedTexts: SavedText[];
  dueCount: number;
  totalCount: number;
  upcomingReviews: UpcomingReviewGroup[];
  sessionDone: number;
  remainingInSession: number;
  currentCard: VocabEntry | null;
  revealed: boolean;
  sessionComplete: boolean;
  hasDeck: boolean;
  speaking: boolean;
  courseUnitFilter: string | null;
  courseUnitOptions: { id: string; label: string }[];
  onCourseUnitFilterChange: (unitId: string | null) => void;
  onReveal: () => void;
  onRate: (rating: FlashcardRating) => void;
  onSpeak: (word: string) => void;
  onStop: () => void;
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
  savedTexts,
  dueCount,
  totalCount,
  upcomingReviews,
  sessionDone,
  remainingInSession,
  currentCard,
  revealed,
  sessionComplete,
  hasDeck,
  speaking,
  courseUnitFilter,
  courseUnitOptions,
  onCourseUnitFilterChange,
  onReveal,
  onRate,
  onSpeak,
  onStop,
  onRestart,
  onStudyAll,
  onCategoryClick,
}: FlashcardsViewProps) {
  const onSpeakRef = useRef(onSpeak);
  const onStopRef = useRef(onStop);
  const onRateRef = useRef(onRate);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [swipeHint, setSwipeHint] = useState<'left' | 'right' | null>(null);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  onSpeakRef.current = onSpeak;
  onStopRef.current = onStop;
  onRateRef.current = onRate;

  const liveCard = useMemo(() => {
    if (!currentCard) return null;
    return vocabulary.find((entry) => entry.id === currentCard.id) ?? currentCard;
  }, [currentCard, vocabulary]);

  const cardContext = useMemo(() => {
    if (!liveCard) return null;
    return findFlashcardContext(liveCard, savedTexts);
  }, [liveCard, savedTexts]);

  const showContextLine =
    revealed &&
    cardContext &&
    normalizePhrase(cardContext.sentence) !== normalizePhrase(liveCard?.word ?? '');

  const contextHighlightPhrase = liveCard ? getVocabKind(liveCard) === 'capsule' : false;

  useEffect(() => {
    if (!currentCard) return;
    const word = currentCard.word;
    const timer = window.setTimeout(() => {
      void onSpeakRef.current(word);
    }, 80);

    return () => {
      window.clearTimeout(timer);
      onStopRef.current();
    };
  }, [currentCard?.id]);

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
        {courseUnitOptions.length > 0 && (
          <label className="field flashcards-unit-filter">
            <span className="field__label">Unidad del curso</span>
            <select
              className="select"
              value={courseUnitFilter ?? ''}
              onChange={(e) => onCourseUnitFilterChange(e.target.value || null)}
            >
              <option value="">Todo el vocabulario</option>
              {courseUnitOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="empty-state">
          <p>
            {courseUnitFilter
              ? 'No hay palabras de esta unidad en tu memoria todavía. Abre la unidad en Curso para empezar.'
              : 'Practica unidades del curso para añadir palabras a Memoria.'}
          </p>
        </div>
      </div>
    );
  }

  const activeUnitLabel = courseUnitFilter
    ? courseUnitOptions.find((option) => option.id === courseUnitFilter)?.label
    : null;

  const header = (
    <>
      <div className="flashcards-header flashcards-header--compact">
        <h2 className="section-title flashcards-header__title">Memoria</h2>
        <span className="flashcards-header__meta">
          {dueCount} pend. · {totalCount} en memoria
        </span>
      </div>
      {courseUnitOptions.length > 0 && (
        <label className="field flashcards-unit-filter">
          <span className="field__label">Unidad del curso</span>
          <select
            className="select"
            value={courseUnitFilter ?? ''}
            onChange={(e) => onCourseUnitFilterChange(e.target.value || null)}
          >
            <option value="">Todo el vocabulario</option>
            {courseUnitOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {activeUnitLabel && (
        <div className="vocab-filter-banner flashcards-unit-filter-banner">
          <span>Unidad: {activeUnitLabel}</span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onCourseUnitFilterChange(null)}
          >
            Quitar
          </button>
        </div>
      )}
      <FlashcardSummary vocabulary={vocabulary} onCategoryClick={onCategoryClick} />
      <UpcomingReviews tiers={upcomingReviews} />
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
    <div className="flashcards-view flashcards-view--active">
      <div className="flashcards-dashboard">
        <div className="flashcards-header flashcards-header--compact">
          <h2 className="section-title flashcards-header__title">Memoria</h2>
          <span className="flashcards-header__meta">
            {sessionTotal > 0
              ? `Sesión ${sessionDone}/${sessionTotal} · ${remainingInSession} rest.`
              : `${dueCount} pend.`}
            {' · '}
            {totalCount} en memoria
          </span>
        </div>
        {activeUnitLabel && (
          <div className="vocab-filter-banner flashcards-unit-filter-banner">
            <span>Unidad: {activeUnitLabel}</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onCourseUnitFilterChange(null)}
            >
              Quitar
            </button>
          </div>
        )}
        <FlashcardSummary vocabulary={vocabulary} onCategoryClick={onCategoryClick} />
        <UpcomingReviews tiers={upcomingReviews} />
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
      </div>

      <div className="flashcards-study">
        <div className="flashcards-study-stage">
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
              <div className="flashcard__accent" aria-hidden />

              <div className="flashcard__body">
                <p className="flashcard__word">{liveCard.word}</p>
                {revealed ? (
                  <>
                    {showContextLine && cardContext && (
                      <FlashcardContextLine
                        sentence={cardContext.sentence}
                        targetNormalized={cardContext.targetNormalized}
                        highlightPhrase={contextHighlightPhrase}
                      />
                    )}
                    <p className="flashcard__translation">
                      {liveCard.translation?.trim() || 'Sin traducción'}
                    </p>
                  </>
                ) : (
                  <p className="flashcard__hint">Toca para ver la respuesta</p>
                )}
              </div>

              <div className="flashcard__footer">
                <span className={vocabKindPillClass(getVocabKind(liveCard))}>
                  {vocabKindLabel(getVocabKind(liveCard))}
                </span>
                <button
                  type="button"
                  className="btn btn--primary btn--icon flashcard__speak"
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
            </article>
          </div>
        </div>

        <div className="flashcards-study-controls">
        {revealed && (
          <>
            <p className="flashcard-swipe-hint" aria-hidden>
              <span className="flashcard-swipe-hint__left">← Desliza · Otra vez</span>
              <span className="flashcard-swipe-hint__right">Bien · Desliza →</span>
            </p>

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
          <p className="hint flashcards-hint">Toca la tarjeta · Espacio para revelar</p>
        )}
        </div>
      </div>
    </div>
  );
}
