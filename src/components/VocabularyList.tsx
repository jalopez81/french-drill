import { useMemo, useState } from 'react';
import type { VocabCategoryFilter, VocabEntry } from '../types';
import type { FlashcardCategory } from '../types';
import { getFlashcardCategory, summarizeFlashcardDeck } from '../utils/spacedRepetition';
import { normalizeWord, uniqueWords } from '../utils/wordExtractor';
import type { SavedText } from '../types';
import { FLASHCARD_CATEGORIES } from '../constants/flashcardCategories';
import { WordCategorySummary } from './WordCategorySummary';
import type { RegenerateProgress } from '../utils/regenerateVocabulary';
import { CategoryProgressBar, ProgressBar } from './ProgressBar';

interface VocabularyListProps {
  entries: VocabEntry[];
  savedTexts: SavedText[];
  categoryFilter: VocabCategoryFilter | null;
  onClearCategoryFilter: () => void;
  onCategoryFilter: (category: FlashcardCategory | null) => void;
  onSpeak: (word: string) => void;
  onSaveTranslation: (word: string, translation: string) => void;
  onRegenerateWord: (word: string) => Promise<string | null>;
  onRegenerateAll: () => void;
  regenerating: boolean;
  regenerateProgress: RegenerateProgress | null;
  onDelete: (id: string) => void;
  onConfirmDelete: (word: string) => Promise<boolean>;
  speaking: boolean;
}

type SortMode = 'recent' | 'alpha' | 'category';

const CATEGORY_ORDER: Record<FlashcardCategory, number> = {
  again: 0,
  hard: 1,
  new: 2,
  good: 3,
  easy: 4,
};

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(ts));
}

function categoryMeta(entry: VocabEntry) {
  const id = getFlashcardCategory(entry);
  const meta = FLASHCARD_CATEGORIES.find((item) => item.id === id);
  return { id, label: meta?.label ?? id, className: meta?.className ?? '' };
}

export function VocabularyList({
  entries,
  savedTexts,
  categoryFilter,
  onClearCategoryFilter,
  onCategoryFilter,
  onSpeak,
  onSaveTranslation,
  onRegenerateWord,
  onRegenerateAll,
  regenerating,
  regenerateProgress,
  onDelete,
  onConfirmDelete,
  speaking,
}: VocabularyListProps) {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTranslation, setDraftTranslation] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const summary = useMemo(() => summarizeFlashcardDeck(entries), [entries]);
  const withoutTranslation = useMemo(
    () => entries.filter((entry) => !entry.translation).length,
    [entries],
  );

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (categoryFilter?.textId) {
      const text = savedTexts.find((item) => item.id === categoryFilter.textId);
      if (text) {
        const words = new Set(uniqueWords(text.content).map(normalizeWord));
        result = result.filter((entry) => words.has(entry.normalized));
      } else {
        result = [];
      }
    }

    if (categoryFilter?.category) {
      result = result.filter(
        (entry) => getFlashcardCategory(entry) === categoryFilter.category,
      );
    }

    const needle = query.trim().toLowerCase();
    if (needle) {
      result = result.filter(
        (entry) =>
          entry.word.toLowerCase().includes(needle) ||
          entry.translation?.toLowerCase().includes(needle),
      );
    }

    return [...result].sort((a, b) => {
      if (sortMode === 'alpha') return a.word.localeCompare(b.word, 'es');
      if (sortMode === 'category') {
        const diff =
          CATEGORY_ORDER[getFlashcardCategory(a)] - CATEGORY_ORDER[getFlashcardCategory(b)];
        return diff !== 0 ? diff : a.word.localeCompare(b.word, 'es');
      }
      return b.addedAt - a.addedAt;
    });
  }, [categoryFilter, entries, query, savedTexts, sortMode]);

  const filterLabel = useMemo(() => {
    if (!categoryFilter?.category) return null;
    return FLASHCARD_CATEGORIES.find((item) => item.id === categoryFilter.category)?.label ?? null;
  }, [categoryFilter]);

  const startEditing = (entry: VocabEntry) => {
    setEditingId(entry.id);
    setDraftTranslation(entry.translation ?? '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftTranslation('');
  };

  const progressLabel = useMemo(() => {
    if (!regenerateProgress) return null;
    if (regenerateProgress.phase === 'audio') return 'Regenerando audios…';
    const current = regenerateProgress.current ? ` · ${regenerateProgress.current}` : '';
    return `Traduciendo ${regenerateProgress.done}/${regenerateProgress.total}${current}`;
  }, [regenerateProgress]);

  return (
    <div className="vocab-list-view">
      <div className="vocab-summary">
        <div className="vocab-summary__row">
          <span className="vocab-summary__count">{entries.length} palabras</span>
          {withoutTranslation > 0 && (
            <span className="vocab-summary__warn">{withoutTranslation} sin traducción</span>
          )}
        </div>
        <WordCategorySummary
          summary={summary}
          variant="inline"
          onCategoryClick={(category) =>
            onCategoryFilter(categoryFilter?.category === category ? null : category)
          }
        />
        {entries.length > 0 && (
          <CategoryProgressBar summary={summary} className="vocab-summary__progress" />
        )}
      </div>

      {filterLabel && (
        <div className="vocab-filter-banner">
          <span>Filtro: {filterLabel}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClearCategoryFilter}>
            Quitar
          </button>
        </div>
      )}

      <div className="vocab-toolbar">
        <label className="vocab-search">
          <span className="sr-only">Buscar en vocabulario</span>
          <input
            type="search"
            className="vocab-search__input"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          className="select vocab-toolbar__sort"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          aria-label="Ordenar vocabulario"
        >
          <option value="recent">Recientes</option>
          <option value="alpha">A–Z</option>
          <option value="category">Por estado</option>
        </select>
        <button
          type="button"
          className="btn btn--secondary btn--sm vocab-toolbar__regen"
          onClick={onRegenerateAll}
          disabled={regenerating || entries.length === 0}
          title="Regenerar traducciones y audios (conserva manuales)"
        >
          {regenerating ? '…' : '↻'}
          <span className="vocab-toolbar__regen-text"> Regenerar</span>
        </button>
      </div>

      {regenerating && progressLabel && (
        <div className="vocab-regen-progress" aria-live="polite">
          <ProgressBar
            value={regenerateProgress?.phase === 'translate' ? regenerateProgress.done : undefined}
            max={regenerateProgress?.total ?? 1}
            indeterminate={regenerateProgress?.phase === 'audio'}
            label={progressLabel}
            showPercent={regenerateProgress?.phase === 'translate'}
            size="sm"
          />
        </div>
      )}

      <div className="vocab-list-body">
        {entries.length === 0 ? (
          <div className="empty-state">
            <p>El vocabulario se llena al guardar lecciones nuevas.</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No hay resultados{query.trim() ? ` para «${query.trim()}»` : ''}.</p>
          </div>
        ) : (
          <ul className="vocab-list">
            {filteredEntries.map((entry) => {
              const isEditing = editingId === entry.id;
              const isBusy = busyId === entry.id;
              const category = categoryMeta(entry);
              const canSave =
                draftTranslation.trim().length > 0 &&
                draftTranslation.trim() !== (entry.translation ?? '').trim();

              return (
                <li key={entry.id} className="vocab-card">
                  {isEditing ? (
                    <>
                      <div className="vocab-card__row vocab-card__row--edit">
                        <span className="vocab-card__word">{entry.word}</span>
                        <input
                          type="text"
                          className="vocab-card__edit-input"
                          value={draftTranslation}
                          onChange={(e) => setDraftTranslation(e.target.value)}
                          disabled={isBusy}
                          placeholder="Traducción…"
                          autoFocus
                        />
                      </div>
                      <div className="vocab-card__actions">
                        <button
                          type="button"
                          className="btn btn--primary vocab-card__action"
                          disabled={!canSave}
                          onClick={() => {
                            onSaveTranslation(entry.word, draftTranslation);
                            cancelEditing();
                          }}
                        >
                          Guardar
                        </button>
                        <button type="button" className="btn btn--ghost vocab-card__action" onClick={cancelEditing}>
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="vocab-card__row">
                        <span className="vocab-card__word">{entry.word}</span>
                        <span className="vocab-card__sep" aria-hidden>
                          ·
                        </span>
                        <span
                          className={`vocab-card__translation${entry.translation ? '' : ' vocab-card__translation--missing'}`}
                        >
                          {entry.translation ?? 'Sin traducción'}
                        </span>
                        <span className={`vocab-card__category ${category.className}`}>
                          {category.label}
                        </span>
                        <span className="vocab-card__date">{formatDate(entry.addedAt)}</span>
                      </div>
                      <div className="vocab-card__actions">
                        <button
                          type="button"
                          className="btn btn--ghost vocab-card__action"
                          onClick={() => startEditing(entry)}
                          aria-label={`Editar ${entry.word}`}
                          title="Editar traducción"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost vocab-card__action"
                          disabled={isBusy || regenerating}
                          onClick={() => {
                            setBusyId(entry.id);
                            void onRegenerateWord(entry.word).finally(() => setBusyId(null));
                          }}
                          aria-label={`Regenerar ${entry.word}`}
                        >
                          {isBusy ? '…' : '↻'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--secondary vocab-card__action"
                          onClick={() => onSpeak(entry.word)}
                          disabled={speaking}
                          aria-label={`Pronunciar ${entry.word}`}
                        >
                          ▶
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost vocab-card__action vocab-card__action--delete"
                          onClick={async () => {
                            const confirmed = await onConfirmDelete(entry.word);
                            if (confirmed) onDelete(entry.id);
                          }}
                          aria-label={`Borrar ${entry.word}`}
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
