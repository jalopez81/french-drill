import { useMemo, useState } from 'react';
import type { SavedText, VocabEntry } from '../types';
import type { FlashcardCategory } from '../types';
import type { StudyLanguage } from '../config/languages';
import { calculateTextMasteryPercent, summarizeWordsInText } from '../utils/textWordStats';
import { getProgressSummary } from '../utils/progressStats';
import { WordCategorySummary } from './WordCategorySummary';
import { CategoryProgressBar, ProgressBar } from './ProgressBar';

interface SavedTextsViewProps {
  texts: SavedText[];
  vocabulary: VocabEntry[];
  studyLanguage: StudyLanguage;
  onPractice: (text: SavedText) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onCategoryClick: (textId: string, category: FlashcardCategory) => void;
  onVocabCategoryClick: (category: FlashcardCategory) => void;
  onConfirmDelete: (title: string) => Promise<boolean>;
}

type SortMode = 'recent' | 'mastery' | 'pending' | 'title';

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ts));
}

function formatRelativePractice(ts?: number): string | null {
  if (!ts) return null;
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Practicada hoy';
  if (days === 1) return 'Practicada ayer';
  return `Practicada hace ${days} días`;
}

function SavedTextCard({
  text,
  vocabulary,
  onPractice,
  onDelete,
  onUpdateTitle,
  onCategoryClick,
  onConfirmDelete,
}: {
  text: SavedText;
  vocabulary: VocabEntry[];
  onPractice: (text: SavedText) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onCategoryClick: (textId: string, category: FlashcardCategory) => void;
  onConfirmDelete: (title: string) => Promise<boolean>;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(text.title);

  const summary = useMemo(
    () => summarizeWordsInText(text, vocabulary),
    [text, vocabulary],
  );

  const wordCount = useMemo(
    () => Object.values(summary).reduce((sum, count) => sum + count, 0),
    [summary],
  );

  const mastery = useMemo(() => calculateTextMasteryPercent(summary), [summary]);
  const lastPractice = formatRelativePractice(text.lastPracticedAt);

  const saveTitle = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== text.title) {
      onUpdateTitle(text.id, trimmed);
    } else {
      setDraftTitle(text.title);
    }
    setEditingTitle(false);
  };

  return (
    <article className="saved-text-card">
      <div className="saved-text-card__body">
        <div className="saved-text-card__header">
          <span className="saved-text-card__title-btn-wrap">
            {editingTitle ? (
              <input
                type="text"
                className="saved-text-card__title-input"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={saveTitle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') saveTitle();
                  if (event.key === 'Escape') {
                    setDraftTitle(text.title);
                    setEditingTitle(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className="saved-text-card__title-btn"
                onClick={() => setEditingTitle(true)}
                title="Editar título"
              >
                {text.title}
              </button>
            )}
          </span>
        </div>
        <p className="saved-text-card__meta">
          {text.sentences.length} oraciones · {wordCount} palabras · {formatDate(text.createdAt)}
          {lastPractice ? ` · ${lastPractice}` : ''}
        </p>
        <ProgressBar
          value={mastery}
          max={100}
          label="Dominio"
          showPercent
          size="sm"
          fillClassName={mastery === 100 ? 'progress__fill--complete' : undefined}
          className="saved-text-card__progress"
        />
        <WordCategorySummary
          summary={summary}
          onCategoryClick={(category) => onCategoryClick(text.id, category)}
        />
      </div>
      <div className="saved-text-card__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={() => onPractice(text)}>
          Practicar
        </button>
        <button
          type="button"
          className="btn btn--sm saved-text-card__delete"
          onClick={async () => {
            const confirmed = await onConfirmDelete(text.title);
            if (confirmed) onDelete(text.id);
          }}
          aria-label={`Eliminar ${text.title}`}
        >
          Borrar
        </button>
      </div>
    </article>
  );
}

export function SavedTextsView({
  texts,
  vocabulary,
  studyLanguage,
  onPractice,
  onDelete,
  onUpdateTitle,
  onCategoryClick,
  onVocabCategoryClick,
  onConfirmDelete,
}: SavedTextsViewProps) {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const progress = useMemo(
    () => getProgressSummary(vocabulary, studyLanguage),
    [vocabulary, studyLanguage],
  );

  const sortedTexts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? texts.filter((text) => text.title.toLowerCase().includes(needle))
      : texts;

    const withStats = filtered.map((text) => {
      const summary = summarizeWordsInText(text, vocabulary);
      const pending = summary.new + summary.again + summary.hard;
      const mastery = calculateTextMasteryPercent(summary);
      return { text, pending, mastery };
    });

    return withStats
      .sort((a, b) => {
        if (sortMode === 'title') return a.text.title.localeCompare(b.text.title, 'es');
        if (sortMode === 'mastery') return a.mastery - b.mastery;
        if (sortMode === 'pending') return b.pending - a.pending;
        const aDate = a.text.lastPracticedAt ?? a.text.createdAt;
        const bDate = b.text.lastPracticedAt ?? b.text.createdAt;
        return bDate - aDate;
      })
      .map((item) => item.text);
  }, [query, sortMode, texts, vocabulary]);

  return (
    <section className="saved-texts-view">
      <h2 className="section-title">Mis lecciones ({texts.length})</h2>

      <div className="lessons-progress-compact">
        <div className="lessons-progress-compact__stats">
          <span className="lessons-progress-compact__stat" title="Racha de días">
            🔥 {progress.streak.currentStreak}
          </span>
          <span className="lessons-progress-compact__stat" title="Dominadas">
            ✓ {progress.mastered}
          </span>
          <span className="lessons-progress-compact__stat" title="Dominadas esta semana">
            +{progress.weeklyMastered}
          </span>
          <span className="lessons-progress-compact__stat" title="Pendientes">
            ⏳ {progress.pending}
          </span>
        </div>
        <WordCategorySummary
          summary={progress.summary}
          variant="inline"
          onCategoryClick={onVocabCategoryClick}
        />
        <CategoryProgressBar
          summary={progress.summary}
          label="Progreso general"
          className="lessons-progress-compact__bar"
        />
      </div>

      {texts.length === 0 ? (
        <div className="empty-state">
          <p>No hay lecciones guardadas. Guarda una desde la pestaña Práctica.</p>
        </div>
      ) : (
        <>
          <div className="saved-texts-toolbar vocab-toolbar">
            <label className="vocab-search vocab-toolbar__search">
              <span className="sr-only">Buscar lección</span>
              <input
                type="search"
                className="vocab-search__input"
                placeholder="Buscar por título…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="vocab-toolbar__controls saved-texts-toolbar__controls">
              <select
                className="select vocab-toolbar__sort"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                aria-label="Ordenar lecciones"
              >
                <option value="recent">Más recientes</option>
                <option value="pending">Más pendientes</option>
                <option value="mastery">Menor dominio</option>
                <option value="title">Título A–Z</option>
              </select>
            </div>
          </div>

          {sortedTexts.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <p>No hay lecciones que coincidan con «{query.trim()}».</p>
            </div>
          ) : (
            <div className="saved-text-cards">
              {sortedTexts.map((text) => (
                <SavedTextCard
                  key={text.id}
                  text={text}
                  vocabulary={vocabulary}
                  onPractice={onPractice}
                  onDelete={onDelete}
                  onUpdateTitle={onUpdateTitle}
                  onCategoryClick={onCategoryClick}
                  onConfirmDelete={onConfirmDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
