interface TextInputProps {
  placeholder: string;
  title: string;
  onTitleChange: (value: string) => void;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCloseLesson?: () => void;
  isLoadedLesson?: boolean;
  onTranslate: () => void;
  onLoadSample: () => void;
  canSave: boolean;
  canTranslate: boolean;
  translating: boolean;
  translated: boolean;
}

export function TextInput({
  placeholder,
  title,
  onTitleChange,
  value,
  onChange,
  onSave,
  onCloseLesson,
  isLoadedLesson = false,
  onTranslate,
  onLoadSample,
  canSave,
  canTranslate,
  translating,
  translated,
}: TextInputProps) {
  return (
    <section className="card">
      <div className="card__header">
        <div className="card__actions">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onTranslate}
            disabled={!canTranslate || translating}
          >
            {translating ? 'Traduciendo…' : translated ? 'Traducido ✓' : 'Traducir'}
          </button>
          {isLoadedLesson ? (
            <button type="button" className="btn btn--secondary btn--sm" onClick={onCloseLesson}>
              Cerrar lección
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={onSave}
              disabled={!canSave}
            >
              Guardar
            </button>
          )}
        </div>
      </div>
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
        className="text-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
      <p className="hint">
        {isLoadedLesson ? (
          <>
            Estás practicando una lección guardada. <strong>Cerrar lección</strong> vacía el texto y
            el título para empezar de nuevo.
          </>
        ) : (
          <>
            Usa <strong>Traducir</strong> para precargar traducciones y pronunciación. Al{' '}
            <strong>Guardar</strong>, las palabras nuevas se agregan al vocabulario con su traducción y audio.
          </>
        )}
      </p>
      <button type="button" className="btn btn--ghost btn--sm sample-btn" onClick={onLoadSample}>
        + 5 oraciones B1 de prueba
      </button>
    </section>
  );
}
