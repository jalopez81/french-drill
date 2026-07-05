import { useEffect, useMemo, useState } from 'react';
import type { MemoryItemCandidate } from '../utils/memoryPreview';
import type { VocabEntryKind } from '../types';

export interface MemoryAddDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  candidates: MemoryItemCandidate[];
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (selected: MemoryItemCandidate[]) => void;
  onCancel: () => void;
}

const GROUP_ORDER: VocabEntryKind[] = ['word', 'sentence', 'capsule'];

const GROUP_TITLES: Record<VocabEntryKind, string> = {
  word: 'Palabras',
  sentence: 'Oraciones',
  capsule: 'Cápsulas',
};

const GROUP_HINTS: Record<VocabEntryKind, string> = {
  word: 'Vocabulario suelto del curso o del texto',
  sentence: 'Oraciones completas de la lección',
  capsule: 'Frases cortas generadas al traducir',
};

function truncate(text: string, max = 72): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function MemoryAddDialog({
  open,
  title,
  subtitle,
  candidates,
  confirmLabel = 'Añadir a Memoria',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: MemoryAddDialogProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!open) return;
    setSelectedKeys(new Set(candidates.map((item) => item.key)));
  }, [open, candidates]);

  const groups = useMemo(() => {
    const map = new Map<VocabEntryKind, MemoryItemCandidate[]>();
    for (const kind of GROUP_ORDER) map.set(kind, []);
    for (const item of candidates) {
      map.get(item.kind)?.push(item);
    }
    return GROUP_ORDER.map((kind) => ({
      kind,
      items: map.get(kind) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [candidates]);

  if (!open) return null;

  const allSelected = candidates.length > 0 && selectedKeys.size === candidates.length;
  const noneSelected = selectedKeys.size === 0;

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (kind: VocabEntryKind, select: boolean) => {
    const group = groups.find((entry) => entry.kind === kind);
    if (!group) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const item of group.items) {
        if (select) next.add(item.key);
        else next.delete(item.key);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(candidates.filter((item) => selectedKeys.has(item.key)));
  };

  return (
    <div className="confirm-overlay" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog memory-add-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-add-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="memory-add-title" className="confirm-dialog__title">
          {title}
        </h3>
        {subtitle && <p className="memory-add-dialog__subtitle">{subtitle}</p>}
        <p className="memory-add-dialog__intro">
          Memoria mezcla palabras, oraciones enteras y cápsulas (frases cortas). Elige qué quieres
          repasar:
        </p>

        <div className="memory-add-dialog__toolbar">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setSelectedKeys(new Set(candidates.map((item) => item.key)))}
            disabled={allSelected}
          >
            Marcar todo
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setSelectedKeys(new Set())}
            disabled={noneSelected}
          >
            Quitar todo
          </button>
          <span className="memory-add-dialog__count">
            {selectedKeys.size}/{candidates.length} seleccionados
          </span>
        </div>

        <div className="memory-add-dialog__list">
          {groups.map((group) => {
            const groupKeys = group.items.map((item) => item.key);
            const groupAllSelected = groupKeys.every((key) => selectedKeys.has(key));
            const groupNoneSelected = groupKeys.every((key) => !selectedKeys.has(key));

            return (
              <section key={group.kind} className="memory-add-dialog__group">
                <header className="memory-add-dialog__group-header">
                  <div>
                    <h4 className="memory-add-dialog__group-title">{GROUP_TITLES[group.kind]}</h4>
                    <p className="memory-add-dialog__group-hint">{GROUP_HINTS[group.kind]}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => toggleGroup(group.kind, groupNoneSelected || !groupAllSelected)}
                  >
                    {groupAllSelected ? 'Quitar grupo' : 'Marcar grupo'}
                  </button>
                </header>
                <ul className="memory-add-dialog__items">
                  {group.items.map((item) => (
                    <li key={item.key}>
                      <label className="memory-add-dialog__item">
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(item.key)}
                          onChange={() => toggleKey(item.key)}
                        />
                        <span className="memory-add-dialog__item-body">
                          <span className="memory-add-dialog__item-word">{truncate(item.word)}</span>
                          {item.translation && (
                            <span className="memory-add-dialog__item-translation">
                              {truncate(item.translation, 56)}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleConfirm}
          >
            {confirmLabel}
            {selectedKeys.size > 0 ? ` (${selectedKeys.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
