import { SpeechSpeedControl } from './SpeechSpeedControl';
import type { SpeechSpeed } from '../utils/speechSpeed';

interface SentenceNavPanelProps {
  selectedIndex: number | null;
  total: number;
  speaking: boolean;
  onRandomWord: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSpeak: () => void;
  speechSpeed: SpeechSpeed;
  onSpeechSpeedChange: (speed: SpeechSpeed) => void;
  speechDisabled?: boolean;
}

export function SentenceNavPanel({
  selectedIndex,
  total,
  speaking,
  onRandomWord,
  onPrevious,
  onNext,
  onSpeak,
  speechSpeed,
  onSpeechSpeedChange,
  speechDisabled = false,
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
          <span className="sentence-nav-panel__btn-full">← Aleatoria</span>
          <span className="sentence-nav-panel__btn-short" aria-hidden>←</span>
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm sentence-nav-panel__btn"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          aria-label="Oración anterior"
        >
          <span className="sentence-nav-panel__btn-full">↑ Ant.</span>
          <span className="sentence-nav-panel__btn-short" aria-hidden>↑</span>
        </button>
        <button
          type="button"
          className={`btn btn--sm sentence-nav-panel__btn sentence-nav-panel__speak ${speaking ? 'btn--danger' : 'btn--primary'}`}
          onClick={onSpeak}
          disabled={total === 0}
          aria-label={speaking ? 'Detener pronunciación' : 'Pronunciar oración actual'}
        >
          <span className="sentence-nav-panel__btn-full">{speaking ? '■ Detener' : '▶ Pronunciar'}</span>
          <span className="sentence-nav-panel__btn-short" aria-hidden>{speaking ? '■' : '▶'}</span>
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm sentence-nav-panel__btn"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Siguiente oración"
        >
          <span className="sentence-nav-panel__btn-full">Sig. ↓</span>
          <span className="sentence-nav-panel__btn-short" aria-hidden>↓</span>
        </button>
      </div>

      <div className="sentence-nav-panel__footer">
        {position !== null && (
          <p className="sentence-nav-panel__meta" aria-live="polite">
            {position}/{total}
          </p>
        )}
        <SpeechSpeedControl
          value={speechSpeed}
          onChange={onSpeechSpeedChange}
          disabled={speechDisabled}
          compact
        />
      </div>

      <p className="sentence-nav-panel__hint">← palabra · ↑↓ oraciones · → pronunciar</p>
    </div>
  );
}
