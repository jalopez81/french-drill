import type { FlashcardCategorySummary } from '../utils/spacedRepetition';
import { FLASHCARD_CATEGORIES } from '../constants/flashcardCategories';

export interface ProgressBarProps {
  value?: number;
  max?: number;
  indeterminate?: boolean;
  label?: string;
  showPercent?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  fillClassName?: string;
  'aria-label'?: string;
}

export function ProgressBar({
  value = 0,
  max = 100,
  indeterminate = false,
  label,
  showPercent = false,
  className,
  size = 'md',
  fillClassName,
  'aria-label': ariaLabel,
}: ProgressBarProps) {
  const safeMax = Math.max(max, 1);
  const percent = Math.min(100, Math.round((value / safeMax) * 100));
  const showHeader = Boolean(label) || (showPercent && !indeterminate);

  return (
    <div className={`progress progress--${size}${className ? ` ${className}` : ''}`}>
      {showHeader && (
        <div className="progress__header">
          {label && <span className="progress__label">{label}</span>}
          {showPercent && !indeterminate && (
            <span className="progress__percent">{percent}%</span>
          )}
        </div>
      )}
      <div
        className={`progress__track${indeterminate ? ' progress__track--indeterminate' : ''}`}
        role="progressbar"
        aria-valuemin={indeterminate ? undefined : 0}
        aria-valuemax={indeterminate ? undefined : safeMax}
        aria-valuenow={indeterminate ? undefined : value}
        aria-label={ariaLabel ?? label}
      >
        {!indeterminate && (
          <div
            className={`progress__fill${fillClassName ? ` ${fillClassName}` : ''}`}
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
    </div>
  );
}

interface CategoryProgressBarProps {
  summary: FlashcardCategorySummary;
  label?: string;
  className?: string;
}

export function CategoryProgressBar({ summary, label, className }: CategoryProgressBarProps) {
  const total = Object.values(summary).reduce((sum, count) => sum + count, 0);
  if (total === 0) return null;

  const ariaLabel =
    label ??
    FLASHCARD_CATEGORIES.filter((category) => summary[category.id] > 0)
      .map((category) => `${category.label}: ${summary[category.id]}`)
      .join(', ');

  return (
    <div className={`progress progress--stacked${className ? ` ${className}` : ''}`}>
      {label && <span className="progress__label">{label}</span>}
      <div className="progress__track progress__track--stacked" role="img" aria-label={ariaLabel}>
        {FLASHCARD_CATEGORIES.map((category) => {
          const count = summary[category.id];
          if (count === 0) return null;
          return (
            <div
              key={category.id}
              className={`progress__segment ${category.className}`}
              style={{ flex: count }}
              title={`${category.label}: ${count}`}
            />
          );
        })}
      </div>
    </div>
  );
}
