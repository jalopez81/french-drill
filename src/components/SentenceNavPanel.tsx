interface SentenceNavPanelProps {
  selectedIndex: number | null;
  total: number;
  speaking: boolean;
  onRandomWord: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSpeak: () => void;
}

export function SentenceNavPanel({
  selectedIndex,
  total,
  speaking,
  onRandomWord,
  onPrevious,
  onNext,
  onSpeak,
}: SentenceNavPanelProps) {
  const position = selectedIndex !== null ? selectedIndex + 1 : null;
  const canGoPrevious = total > 0 && (selectedIndex === null || selectedIndex > 0);
  const canGoNext = total > 0 && (selectedIndex === null || selectedIndex < total - 1);

  return (
    <div className="sentence-nav-panel" aria-label="Navegación de oraciones">
      <div className="sentence-nav-panel__controls">
        <button
          type="button"
          className="btn btn--secondary btn--sm sentence-nav-panel__btn"
          onClick={onRandomWord}
          disabled={total === 0}
          aria-label="Palabra aleatoria"
        >
          ← Random
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm sentence-nav-panel__btn"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          aria-label="Oración anterior"
        >
          ↑ Ant.
        </button>
        <button
          type="button"
          className={`btn btn--sm sentence-nav-panel__btn sentence-nav-panel__speak ${speaking ? 'btn--danger' : 'btn--primary'}`}
          onClick={onSpeak}
          disabled={total === 0}
          aria-label={speaking ? 'Detener pronunciación' : 'Pronunciar oración actual'}
        >
          {speaking ? '■ Detener' : '▶ Pronunciar'}
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm sentence-nav-panel__btn"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Siguiente oración"
        >
          Sig. ↓
        </button>
      </div>
      {position !== null && (
        <p className="sentence-nav-panel__meta" aria-live="polite">
          Oración {position} de {total}
        </p>
      )}
      <p className="sentence-nav-panel__hint">← palabra · ↑↓ oraciones · → pronunciar</p>
    </div>
  );
}
