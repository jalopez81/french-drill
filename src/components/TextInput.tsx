import type { ReactNode } from 'react';

interface TextInputProps {
  placeholder: string;
  title: string;
  onTitleChange: (value: string) => void;
  value: string;
  onChange: (value: string) => void;
  onLoadSample: () => void;
  isLoadedLesson?: boolean;
  editorCollapsed?: boolean;
  showActions?: boolean;
  actions?: ReactNode;
}

export function TextInput({
  placeholder,
  title,
  onTitleChange,
  value,
  onChange,
  onLoadSample,
  isLoadedLesson = false,
  editorCollapsed = false,
  showActions = true,
  actions,
}: TextInputProps) {
  const hasText = value.trim().length > 0;
  const showCollapsed = editorCollapsed && hasText;

  if (showCollapsed) return null;

  return (
    <section className="card practice-editor">
      {isLoadedLesson && (
        <div className="banner banner--info banner--compact">Lección guardada</div>
      )}

      <div className="practice-editor__fields">
        <label className="field field--compact">
          <input
            type="text"
            className="title-input"
            placeholder="Título"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </label>
        <textarea
          className="text-input text-input--compact"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
        {!hasText && (
          <button type="button" className="btn btn--ghost btn--sm sample-btn" onClick={onLoadSample}>
            + 5 oraciones B1 de prueba
          </button>
        )}
      </div>

      {showActions && actions}
    </section>
  );
}
