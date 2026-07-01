import type { FlashcardCategorySummary } from '../utils/spacedRepetition';
import { FLASHCARD_CATEGORIES } from '../constants/flashcardCategories';
import type { FlashcardCategory } from '../types';

interface WordCategorySummaryProps {
  summary: FlashcardCategorySummary;
  variant?: 'grid' | 'inline';
  onCategoryClick?: (category: FlashcardCategory) => void;
}

export function WordCategorySummary({
  summary,
  variant = 'inline',
  onCategoryClick,
}: WordCategorySummaryProps) {
  const interactive = Boolean(onCategoryClick);

  if (variant === 'grid') {
    return (
      <section className="flashcard-stats" aria-label="Resumen por categoría">
        {FLASHCARD_CATEGORIES.map((category) => {
          const count = summary[category.id];
          const Tag = interactive && count > 0 ? 'button' : 'article';
          return (
            <Tag
              key={category.id}
              type={interactive && count > 0 ? 'button' : undefined}
              className={`flashcard-stat ${category.className}${interactive && count > 0 ? ' flashcard-stat--clickable' : ''}`}
              onClick={
                interactive && count > 0 ? () => onCategoryClick?.(category.id) : undefined
              }
              aria-label={
                interactive && count > 0
                  ? `${category.label}: ${count}. Toca para repasar`
                  : undefined
              }
            >
              <span className="flashcard-stat__count">{count}</span>
              <span className="flashcard-stat__label">{category.label}</span>
            </Tag>
          );
        })}
      </section>
    );
  }

  return (
    <div className="word-category-inline" aria-label="Resumen de palabras">
      {FLASHCARD_CATEGORIES.map((category) => {
        const count = summary[category.id];
        const Tag = interactive && count > 0 ? 'button' : 'span';
        return (
          <Tag
            key={category.id}
            type={interactive && count > 0 ? 'button' : undefined}
            className={`word-category-chip ${category.className}${interactive && count > 0 ? ' word-category-chip--clickable' : ''}`}
            onClick={
              interactive && count > 0 ? () => onCategoryClick?.(category.id) : undefined
            }
            aria-label={
              interactive && count > 0
                ? `${category.label}: ${count}. Toca para filtrar`
                : undefined
            }
          >
            <span className="word-category-chip__label">{category.label}</span>
            <span className="word-category-chip__count">{count}</span>
          </Tag>
        );
      })}
    </div>
  );
}
