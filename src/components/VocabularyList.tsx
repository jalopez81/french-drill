import { useMemo, useState, useEffect } from 'react';
import type { VocabCategoryFilter, VocabEntry } from '../types';
import type { FlashcardCategory } from '../types';
import { getFlashcardCategory, summarizeFlashcardDeck } from '../utils/spacedRepetition';
import { normalizeWord, uniqueWords, countPhraseWords } from '../utils/wordExtractor';
import { getVocabKind, vocabKindChipClass, vocabKindLabel } from '../utils/vocabKind';
import type { SavedText } from '../types';
import { FLASHCARD_CATEGORIES } from '../constants/flashcardCategories';
import { WordCategorySummary } from './WordCategorySummary';
import { isLexiconPlaceholderId, getLexiconLevelForWord, loadCourseData, LEXICON_LEVELS, type LexiconLevel } from '../utils/course';
import type { RegenerateProgress } from '../utils/regenerateVocabulary';
import { ProgressBar } from './ProgressBar';

interface VocabularyListProps {
  entries: VocabEntry[];
  lexiconTotal: number;
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
  onDelete: (id: string, normalized?: string) => void;
  onConfirmDelete: (word: string) => Promise<boolean>;
  speaking: boolean;
  showTranslations: boolean;
}

function entryLevel(entry: VocabEntry): string | undefined {
  return entry.lexiconLevel ?? getLexiconLevelForWord(entry.word);
}

type SortMode = 'recent' | 'alpha' | 'category';

const CATEGORY_ORDER: Record<FlashcardCategory, number> = {
  again: 0,
  hard: 1,
  new: 2,
  good: 3,
  easy: 4,
};

const MAX_VOCAB_WORDS = 4;

function isVocabPhrase(entry: VocabEntry): boolean {
  return countPhraseWords(entry.word) >= 2;
}

function formatDate(ts: number): string {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(ts));
}

export function VocabularyList({
  entries,
  lexiconTotal,
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
  showTranslations,
}: VocabularyListProps) {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTranslation, setDraftTranslation] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<LexiconLevel | ''>('');

  useEffect(() => {
    void loadCourseData();
  }, []);

  const vocabularyItems = useMemo(
    () =>
      entries.filter((entry) => {
        const kind = getVocabKind(entry);
        if (kind === 'capsule' || kind === 'sentence') return false;
        return countPhraseWords(entry.word) <= MAX_VOCAB_WORDS;
      }),
    [entries],
  );

  const summary = useMemo(() => summarizeFlashcardDeck(vocabularyItems), [vocabularyItems]);
  const withoutTranslation = useMemo(
    () => vocabularyItems.filter((entry) => !entry.translation).length,
    [vocabularyItems],
  );

  const filteredEntries = useMemo(() => {
    let result = vocabularyItems;

    if (categoryFilter?.textId) {
      const text = savedTexts.find((item) => item.id === categoryFilter.textId);
      if (text) {
        const words = new Set(uniqueWords(text.content).map(normalizeWord));
        result = result.filter(
          (entry) =>
            entry.sourceTextId === categoryFilter.textId ||
            ((!entry.kind || entry.kind === 'word') && words.has(entry.normalized)),
        );
      } else {
        result = [];
      }
    }

    if (categoryFilter?.category) {
      result = result.filter(
        (entry) => getFlashcardCategory(entry) === categoryFilter.category,
      );
    }

    if (levelFilter) {
      result = result.filter((entry) => entryLevel(entry) === levelFilter);
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
  }, [categoryFilter, levelFilter, vocabularyItems, query, savedTexts, sortMode]);

  const filterLabel = useMemo(() => {
    const parts: string[] = [];
    if (levelFilter) parts.push(levelFilter);
    if (categoryFilter?.category) {
      parts.push(
        FLASHCARD_CATEGORIES.find((item) => item.id === categoryFilter.category)?.label ??
          categoryFilter.category,
      );
    }
    return parts.length > 0 ? parts.join(' · ') : null;
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
    if (regenerateProgress.phase === 'audio') {
      return regenerateProgress.remaining !== undefined
        ? `Preparando audios… faltan ${regenerateProgress.remaining}`
        : 'Preparando audios…';
    }
    const current = regenerateProgress.current ? ` · ${regenerateProgress.current}` : '';
    return `Traduciendo ${regenerateProgress.done}/${regenerateProgress.total}${current}`;
  }, [regenerateProgress]);

  return (
    <div className="vocab-list-view">
      <div className="vocab-summary vocab-list-view__chrome">
        <div className="vocab-summary__row">
          <span className="vocab-summary__count">
            {filteredEntries.length}
            {levelFilter || categoryFilter?.category ? ` de ${vocabularyItems.length}` : ''} / {lexiconTotal} términos
          </span>
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
      </div>

      {(filterLabel || levelFilter) && (
        <div className="vocab-filter-banner vocab-list-view__chrome">
          <span>Filtro: {filterLabel || levelFilter}</span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              onClearCategoryFilter();
              setLevelFilter('');
            }}
          >
            Quitar
          </button>
        </div>
      )}

      <div className="vocab-toolbar vocab-list-view__chrome">
        <label className="vocab-search vocab-toolbar__search">
          <span className="sr-only">Buscar en vocabulario</span>
          <input
            type="search"
            className="vocab-search__input"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="vocab-toolbar__controls">
          <select
            className="select vocab-toolbar__sort"
            value={levelFilter}
            onChange={(event) => setLevelFilter((event.target.value || '') as LexiconLevel | '')}
            aria-label="Filtrar por nivel CEFR"
          >
            <option value="">Todos los niveles</option>
            {LEXICON_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
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
            className="btn btn--secondary vocab-toolbar__regen"
            onClick={onRegenerateAll}
            disabled={regenerating || vocabularyItems.length === 0}
            title="Regenerar traducciones y audios (conserva manuales)"
          >
            {regenerating ? 'Regenerando…' : 'Regenerar'}
          </button>
        </div>
      </div>

      {regenerating && progressLabel && (
        <div className="vocab-regen-progress vocab-list-view__chrome" aria-live="polite">
          <ProgressBar
            value={regenerateProgress?.done}
            max={regenerateProgress?.total ?? 1}
            indeterminate={
              regenerateProgress?.phase === 'audio' &&
              (regenerateProgress.remaining === undefined || regenerateProgress.remaining <= 0)
            }
            label={progressLabel}
            showPercent={Boolean(regenerateProgress && regenerateProgress.total > 0)}
            size="sm"
          />
        </div>
      )}

      <div className="vocab-list-body">
        {vocabularyItems.length === 0 ? (
          <div className="empty-state">
            <p>
              {entries.length === 0
                ? 'El vocabulario se llena al guardar lecciones nuevas.'
                : 'No hay palabras ni frases cortas aquí. Cápsulas y oraciones están en Memoria.'}
            </p>
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
              const kind = getVocabKind(entry);
              const isPhrase = isVocabPhrase(entry);
              const isLexiconOnly = isLexiconPlaceholderId(entry.id);
              const canSave =
                draftTranslation.trim().length > 0 &&
                draftTranslation.trim() !== (entry.translation ?? '').trim();

              return (
                <li key={entry.id} className={`vocab-card${isPhrase ? ' vocab-card--phrase' : ''}`}>
                  <span className="vocab-card__date">
                    {entryLevel(entry) && (
                      <span className={`vocab-card__level vocab-card__level--${entryLevel(entry)!.toLowerCase()}`}>
                        {entryLevel(entry)}
                      </span>
                    )}
                    {formatDate(entry.addedAt)}
                  </span>
                  {isEditing ? (
                    <div className={`vocab-card__main${isPhrase ? ' vocab-card__main--phrase' : ''}`}>
                      <span className={vocabKindChipClass(kind)} aria-hidden>
                        {vocabKindLabel(kind)}
                      </span>
                      {isPhrase ? (
                        <div className="vocab-card__phrase">
                          <span className="vocab-card__phrase-line">{entry.word}</span>
                          <input
                            type="text"
                            className="vocab-card__phrase-edit"
                            value={draftTranslation}
                            onChange={(e) => setDraftTranslation(e.target.value)}
                            disabled={isBusy}
                            placeholder="Traducción…"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
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
                        <button
                          type="button"
                          className="btn btn--ghost vocab-card__action"
                          onClick={cancelEditing}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`vocab-card__main${isPhrase ? ' vocab-card__main--phrase' : ''}`}>
                      <span className={vocabKindChipClass(kind)} aria-hidden>
                        {vocabKindLabel(kind)}
                      </span>
                      {isPhrase ? (
                        <div className="vocab-card__phrase">
                          <span className="vocab-card__phrase-line">{entry.word}</span>
                          {showTranslations ? (
                            <span
                              className={`vocab-card__phrase-line vocab-card__phrase-line--translation${entry.translation ? '' : ' vocab-card__phrase-line--missing'}`}
                            >
                              {entry.translation ?? 'Sin traducción'}
                            </span>
                          ) : (
                            <span className="vocab-card__phrase-line vocab-card__phrase-line--hidden" aria-hidden />
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="vocab-card__word">{entry.word}</span>
                          {showTranslations ? (
                            <span
                              className={`vocab-card__translation${entry.translation ? '' : ' vocab-card__translation--missing'}`}
                            >
                              {entry.translation ?? 'Sin traducción'}
                            </span>
                          ) : (
                            <span className="vocab-card__translation vocab-card__translation--hidden" aria-hidden />
                          )}
                        </>
                      )}
                      <div className="vocab-card__actions">
                        <button
                          type="button"
                          className="btn btn--secondary vocab-card__action"
                          onClick={() => onSpeak(entry.word)}
                          disabled={speaking}
                          aria-label={`Pronunciar ${entry.word}`}
                          title="Pronunciar"
                        >
                          ▶
                        </button>
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
                          title="Volver a buscar traducción y audio (respeta traducciones manuales)"
                        >
                          {isBusy ? '…' : '↻'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost vocab-card__action vocab-card__action--delete"
                          onClick={async () => {
                            const confirmed = await onConfirmDelete(entry.word);
                            if (confirmed) onDelete(entry.id, entry.normalized);
                          }}
                          aria-label={`Borrar ${entry.word}`}
                          title={
                            isLexiconOnly
                              ? 'Quitar de tu vocabulario SRS (permanece en el lexicón)'
                              : 'Eliminar de vocabulario y Memoria'
                          }
                        >
                          ✕
                        </button>
                      </div>
                    </div>
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
