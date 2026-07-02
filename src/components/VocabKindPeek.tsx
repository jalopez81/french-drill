import { useMemo, useState } from 'react';
import type { VocabEntry, VocabEntryKind } from '../types';
import { bucketVocabByKind, vocabKindLabel } from '../utils/vocabKind';

interface VocabKindPeekProps {
  vocabulary: VocabEntry[];
  className?: string;
}

const KIND_ORDER: VocabEntryKind[] = ['word', 'capsule', 'sentence'];

export function VocabKindPeek({ vocabulary, className = '' }: VocabKindPeekProps) {
  const [open, setOpen] = useState(false);
  const buckets = useMemo(() => bucketVocabByKind(vocabulary), [vocabulary]);

  return (
    <div className={`vocab-kind-peek${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="btn btn--ghost btn--sm vocab-kind-peek__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? 'Ocultar tipos' : 'Ver tipos (temp)'}
      </button>
      {open && (
        <div className="vocab-kind-peek__panel">
          {KIND_ORDER.map((kind) => (
            <details key={kind} className="vocab-kind-peek__group" open={buckets[kind].length > 0}>
              <summary>
                {vocabKindLabel(kind)} · {buckets[kind].length}
              </summary>
              {buckets[kind].length === 0 ? (
                <p className="hint vocab-kind-peek__empty">Ninguna</p>
              ) : (
                <ul className="vocab-kind-peek__list">
                  {buckets[kind].slice(0, 12).map((entry) => (
                    <li key={entry.id}>
                      <span className="vocab-kind-peek__text">{entry.word}</span>
                      {entry.translation && (
                        <span className="vocab-kind-peek__translation">{entry.translation}</span>
                      )}
                    </li>
                  ))}
                  {buckets[kind].length > 12 && (
                    <li className="vocab-kind-peek__more">+{buckets[kind].length - 12} más</li>
                  )}
                </ul>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
