import { useMemo, useState } from 'react';
import type { VocabEntry } from '../types';
import { EyeButton } from './EyeButton';

interface VocabularyListProps {
  entries: VocabEntry[];
  onSpeak: (word: string) => void;
  onSaveTranslation: (word: string, translation: string) => void;
  onRefetchTranslation: (word: string) => Promise<string | null>;
  onDelete: (id: string) => void;
  speaking: boolean;
}

const pillColors = ['pill--green', 'pill--blue', 'pill--purple', 'pill--orange', 'pill--teal'];

function pillClass(index: number): string {
  return pillColors[index % pillColors.length];
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(ts));
}

export function VocabularyList({
  entries,
  onSpeak,
  onSaveTranslation,
  onRefetchTranslation,
  onDelete,
  speaking,
}: VocabularyListProps) {
  const [query, setQuery] = useState('');
  const [showTranslations, setShowTranslations] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTranslation, setDraftTranslation] = useState('');
  const [refetchingId, setRefetchingId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;

    return entries.filter(
      (entry) =>
        entry.word.toLowerCase().includes(needle) ||
        entry.translation?.toLowerCase().includes(needle),
    );
  }, [entries, query]);

  const startEditing = (entry: VocabEntry) => {
    setEditingId(entry.id);
    setDraftTranslation(entry.translation ?? '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftTranslation('');
  };

  return (
    <div className="vocab-list-view">
      <div className="vocab-toolbar">
        <label className="vocab-search">
          <span className="sr-only">Buscar en vocabulario</span>
          <input
            type="search"
            className="vocab-search__input"
            placeholder="Buscar palabra o traducción…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <EyeButton
          active={showTranslations}
          onClick={() => setShowTranslations((visible) => !visible)}
          label={showTranslations ? 'Ocultar traducciones' : 'Mostrar traducciones'}
        />
      </div>

      <div className="vocab-list-body">
        {entries.length === 0 ? (
          <div className="empty-state">
            <p>El vocabulario se llena al guardar lecciones nuevas.</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No hay resultados para «{query.trim()}».</p>
          </div>
        ) : (
          <ul className="vocab-list">
            {filteredEntries.map((entry, index) => {
              const isEditing = editingId === entry.id;
              const isRefetching = refetchingId === entry.id;
              const canSave =
                draftTranslation.trim().length > 0 &&
                draftTranslation.trim() !== (entry.translation ?? '').trim();

              return (
                <li key={entry.id} className="vocab-list__item">
                  <div className="vocab-list__info">
                    <div className="vocab-list__main">
                      <span className={`pill ${pillClass(index)}`}>{entry.word}</span>
                      {showTranslations && !isEditing && entry.translation && (
                        <span className="vocab-list__translation">{entry.translation}</span>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="vocab-list__edit">
                        <input
                          type="text"
                          className="vocab-list__edit-input"
                          value={draftTranslation}
                          onChange={(e) => setDraftTranslation(e.target.value)}
                          disabled={isRefetching}
                          placeholder="Traducción…"
                        />
                        <div className="vocab-list__edit-actions">
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
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
                            className="btn btn--ghost btn--sm"
                            disabled={isRefetching}
                            onClick={() => {
                              setRefetchingId(entry.id);
                              void onRefetchTranslation(entry.word)
                                .then((translation) => {
                                  if (translation) setDraftTranslation(translation);
                                })
                                .finally(() => setRefetchingId(null));
                            }}
                          >
                            {isRefetching ? '…' : 'Retraducir'}
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={cancelEditing}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="vocab-list__date">{formatDate(entry.addedAt)}</span>
                    )}
                  </div>
                  <div className="vocab-list__actions">
                    {showTranslations && !isEditing && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => startEditing(entry)}
                      >
                        Editar
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--secondary btn--icon"
                      onClick={() => onSpeak(entry.word)}
                      disabled={speaking}
                      aria-label={`Pronunciar ${entry.word}`}
                    >
                      ▶
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm vocab-list__delete"
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Borrar «${entry.word}» del vocabulario?\n\nTambién desaparecerá de Memoria.`,
                          )
                        ) {
                          onDelete(entry.id);
                        }
                      }}
                      aria-label={`Borrar ${entry.word}`}
                    >
                      Borrar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
