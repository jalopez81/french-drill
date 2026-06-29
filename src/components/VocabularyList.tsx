import { useMemo, useState } from 'react';
import type { VocabEntry } from '../types';

interface VocabularyListProps {
  entries: VocabEntry[];
  showTranslations: boolean;
  onSpeak: (word: string) => void;
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

export function VocabularyList({ entries, showTranslations, onSpeak, speaking }: VocabularyListProps) {
  const [query, setQuery] = useState('');

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;

    return entries.filter(
      (entry) =>
        entry.word.toLowerCase().includes(needle) ||
        entry.translation?.toLowerCase().includes(needle),
    );
  }, [entries, query]);

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <p>El vocabulario se llena al guardar lecciones nuevas.</p>
      </div>
    );
  }

  return (
    <div className="vocab-list-view">
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

      {filteredEntries.length === 0 ? (
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
              <button
                type="button"
                className="btn btn--secondary btn--icon"
                onClick={() => onSpeak(entry.word)}
                disabled={speaking}
                aria-label={`Pronunciar ${entry.word}`}
              >
                ▶
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
