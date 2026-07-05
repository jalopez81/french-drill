import type { SavedText } from '../types';

interface PersonalPracticeListProps {
  texts: SavedText[];
  activeId: string | null;
  onLoad: (text: SavedText) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onConfirmDelete: (title: string) => Promise<boolean>;
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(ts));
}

export function PersonalPracticeList({
  texts,
  activeId,
  onLoad,
  onDelete,
  onNew,
  onConfirmDelete,
}: PersonalPracticeListProps) {
  const sorted = [...texts].sort(
    (a, b) => (b.lastPracticedAt ?? b.createdAt) - (a.lastPracticedAt ?? a.createdAt),
  );

  return (
    <section className="personal-practice-list" aria-label="Conversaciones guardadas">
      <div className="personal-practice-list__header">
        <h3 className="personal-practice-list__title">
          Mis conversaciones
          {texts.length > 0 && (
            <span className="personal-practice-list__count">{texts.length}</span>
          )}
        </h3>
        {activeId && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onNew}>
            + Nueva
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="hint personal-practice-list__empty">
          Pega un texto y pulsa Guardar para retomarlo aquí.
        </p>
      ) : (
        <ul className="personal-practice-list__items">
          {sorted.map((text) => {
            const isActive = text.id === activeId;
            return (
              <li key={text.id}>
                <button
                  type="button"
                  className={`personal-practice-item${isActive ? ' personal-practice-item--active' : ''}`}
                  onClick={() => onLoad(text)}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span className="personal-practice-item__title">{text.title}</span>
                  <span className="personal-practice-item__meta">
                    {text.sentences.length} or. · {formatDate(text.lastPracticedAt ?? text.createdAt)}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm personal-practice-item__delete"
                  onClick={async () => {
                    const confirmed = await onConfirmDelete(text.title);
                    if (confirmed) onDelete(text.id);
                  }}
                  aria-label={`Borrar ${text.title}`}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
