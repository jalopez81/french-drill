interface PracticeActionBarProps {
  editorCollapsed: boolean;
  onToggleEditor?: () => void;
  hasText: boolean;
  hasSentences: boolean;
  readingAll: boolean;
  onReadAll?: () => void;
  onStopReadAll?: () => void;
  speaking: boolean;
  onTranslate: () => void;
  canTranslate: boolean;
  translating: boolean;
  translated: boolean;
  saving: boolean;
  isLoadedLesson: boolean;
  onCloseLesson?: () => void;
  onSave: () => void;
  canSave: boolean;
  sticky?: boolean;
}

export function PracticeActionBar({
  editorCollapsed,
  onToggleEditor,
  hasText,
  hasSentences,
  readingAll,
  onReadAll,
  onStopReadAll,
  speaking,
  onTranslate,
  canTranslate,
  translating,
  translated,
  saving,
  isLoadedLesson,
  onCloseLesson,
  onSave,
  canSave,
  sticky = false,
}: PracticeActionBarProps) {
  const showCollapsed = editorCollapsed && hasText;

  return (
    <div className={`practice-editor__actions${sticky ? ' practice-editor__actions--sticky' : ''}`}>
      {hasText && onToggleEditor && (
        <button
          type="button"
          className={`btn btn--secondary practice-editor__action${showCollapsed ? ' practice-editor__action--primary' : ''}`}
          onClick={onToggleEditor}
          aria-expanded={!showCollapsed}
          aria-label={showCollapsed ? 'Editar texto' : 'Mostrar oraciones'}
        >
          <span className="practice-editor__action-full">
            {showCollapsed ? '✏️ Editar' : '↓ Oraciones'}
          </span>
          <span className="practice-editor__action-short" aria-hidden>
            {showCollapsed ? '✏️' : '↓'}
          </span>
        </button>
      )}

      {hasSentences && (
        readingAll ? (
          <button
            type="button"
            className="btn btn--danger practice-editor__action"
            onClick={onStopReadAll}
            aria-label="Detener lectura"
          >
            <span className="practice-editor__action-full">■ Detener</span>
            <span className="practice-editor__action-short" aria-hidden>■</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--secondary practice-editor__action"
            onClick={onReadAll}
            disabled={speaking}
            aria-label="Leer toda la lección"
          >
            <span className="practice-editor__action-full">▶ Leer</span>
            <span className="practice-editor__action-short" aria-hidden>▶</span>
          </button>
        )
      )}

      <button
        type="button"
        className="btn btn--secondary practice-editor__action"
        onClick={onTranslate}
        disabled={!canTranslate || translating || saving}
        aria-label="Traducir lección"
      >
        {translating ? 'Traduciendo…' : translated ? 'Traducido ✓' : 'Traducir'}
      </button>

      {isLoadedLesson ? (
        <button
          type="button"
          className="btn btn--secondary practice-editor__action"
          onClick={onCloseLesson}
          aria-label="Cerrar lección"
        >
          <span className="practice-editor__action-full">Cerrar</span>
          <span className="practice-editor__action-short" aria-hidden>✕</span>
        </button>
      ) : (
        <button
          type="button"
          className="btn btn--primary practice-editor__action"
          onClick={onSave}
          disabled={!canSave || saving}
          aria-label="Guardar lección"
        >
          {saving ? '…' : 'Guard.'}
        </button>
      )}
    </div>
  );
}
