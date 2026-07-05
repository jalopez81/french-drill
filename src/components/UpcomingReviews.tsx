import type { UpcomingReviewGroup } from '../utils/spacedRepetition';

interface UpcomingReviewsProps {
  tiers: UpcomingReviewGroup[];
}

export function UpcomingReviews({ tiers }: UpcomingReviewsProps) {
  return (
    <section className="flashcards-upcoming" aria-label="Próximos repasos por intervalo">
      <header className="flashcards-upcoming__header">
        <span className="flashcards-upcoming__icon" aria-hidden>⏱</span>
        <div className="flashcards-upcoming__heading">
          <h3 className="flashcards-upcoming__title">Próximas palabras</h3>
          <p className="flashcards-upcoming__subtitle">Palabras programadas por intervalo SRS</p>
        </div>
      </header>
      <ul className="flashcards-upcoming__grid">
        {tiers.map((tier) => (
          <li
            key={tier.id}
            className={`flashcards-upcoming__tier${tier.count > 0 ? ' flashcards-upcoming__tier--active' : ''}`}
          >
            <span className="flashcards-upcoming__count">{tier.count}</span>
            <span className="flashcards-upcoming__label">{tier.intervalLabel}</span>
            <span className="flashcards-upcoming__words">
              {tier.count === 1 ? 'palabra' : 'palabras'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
