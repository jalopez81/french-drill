import { useMemo } from 'react';
import type { SavedText, VocabEntry } from '../types';
import { calculateTextMasteryPercent, summarizeWordsInText } from '../utils/textWordStats';
import { WordCategorySummary } from './WordCategorySummary';

interface SavedTextsViewProps {
  texts: SavedText[];
  vocabulary: VocabEntry[];
  onPractice: (text: SavedText) => void;
  onDelete: (id: string) => void;
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ts));
}

function SavedTextCard({
  text,
  vocabulary,
  onPractice,
  onDelete,
}: {
  text: SavedText;
  vocabulary: VocabEntry[];
  onPractice: (text: SavedText) => void;
  onDelete: (id: string) => void;
}) {
  const summary = useMemo(
    () => summarizeWordsInText(text, vocabulary),
    [text, vocabulary],
  );

  const wordCount = useMemo(
    () => Object.values(summary).reduce((sum, count) => sum + count, 0),
    [summary],
  );

  const mastery = useMemo(() => calculateTextMasteryPercent(summary), [summary]);

  return (
    <article className="saved-text-card">
      <div className="saved-text-card__body">
        <div className="saved-text-card__header">
          <h3 className="saved-text-card__title">{text.title}</h3>
          <span
            className={`saved-text-card__mastery${mastery === 100 ? ' saved-text-card__mastery--complete' : ''}`}
            title="Dominio aproximado de la lección"
            aria-label={`Dominio aproximado: ${mastery} por ciento`}
          >
            {mastery}%
          </span>
        </div>
        <p className="saved-text-card__meta">
          {text.sentences.length} oraciones · {wordCount} palabras · {formatDate(text.createdAt)}
        </p>
        <WordCategorySummary summary={summary} />
      </div>
      <div className="saved-text-card__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={() => onPractice(text)}>
          Practicar
        </button>
        <button
          type="button"
          className="btn btn--sm saved-text-card__delete"
          onClick={() => onDelete(text.id)}
          aria-label={`Eliminar ${text.title}`}
        >
          Borrar
        </button>
      </div>
    </article>
  );
}

export function SavedTextsView({ texts, vocabulary, onPractice, onDelete }: SavedTextsViewProps) {
  if (texts.length === 0) {
    return (
      <section className="saved-texts-view">
        <h2 className="section-title">Mis lecciones</h2>
        <div className="empty-state">
          <p>No hay lecciones guardadas. Guarda una desde la pestaña Práctica.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="saved-texts-view">
      <h2 className="section-title">Mis lecciones ({texts.length})</h2>
      <div className="saved-text-cards">
        {texts.map((text) => (
          <SavedTextCard
            key={text.id}
            text={text}
            vocabulary={vocabulary}
            onPractice={onPractice}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
