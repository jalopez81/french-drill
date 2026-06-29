import type { FlashcardCategorySummary } from '../utils/spacedRepetition';
import { FLASHCARD_CATEGORIES } from '../constants/flashcardCategories';

interface WordCategorySummaryProps {
  summary: FlashcardCategorySummary;
  variant?: 'grid' | 'inline';
}

export function WordCategorySummary({ summary, variant = 'inline' }: WordCategorySummaryProps) {
  if (variant === 'grid') {
    return (
      <section className="flashcard-stats" aria-label="Resumen por categoría">
        {FLASHCARD_CATEGORIES.map((category) => (
          <article key={category.id} className={`flashcard-stat ${category.className}`}>
            <span className="flashcard-stat__count">{summary[category.id]}</span>
            <span className="flashcard-stat__label">{category.label}</span>
          </article>
        ))}
      </section>
    );
  }

  return (
    <div className="word-category-inline" aria-label="Resumen de palabras">
      {FLASHCARD_CATEGORIES.map((category) => (
        <span key={category.id} className={`word-category-chip ${category.className}`}>
          <span className="word-category-chip__label">{category.label}</span>
          <span className="word-category-chip__count">{summary[category.id]}</span>
        </span>
      ))}
    </div>
  );
}
