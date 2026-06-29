import { useMemo, useState } from 'react';
import type { VocabEntry } from '../types';
import { EyeButton } from './EyeButton';

interface VocabularyListProps {
  entries: VocabEntry[];
  onSpeak: (word: string) => void;
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

export function VocabularyList({ entries, onSpeak, onDelete, speaking }: VocabularyListProps) {
  const [query, setQuery] = useState('');
  const [showTranslations, setShowTranslations] = useState(false);

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;

    return entries.filter(
      (entry) =>
        entry.word.toLowerCase().includes(needle) ||
        entry.translation?.toLowerCase().includes(needle),
    );
  }, [entries, query]);

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
            {filteredEntries.map((entry, index) => (
              <li key={entry.id} className="vocab-list__item">
                <div className="vocab-list__info">
                  <div className="vocab-list__main">
                    <span className={`pill ${pillClass(index)}`}>{entry.word}</span>
                    {entry.translation && showTranslations && (
                      <span className="vocab-list__translation">{entry.translation}</span>
                    )}
                  </div>
                  <span className="vocab-list__date">{formatDate(entry.addedAt)}</span>
                </div>
                <div className="vocab-list__actions">
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
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
