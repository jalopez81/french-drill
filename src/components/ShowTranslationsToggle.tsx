interface ShowTranslationsToggleProps {
  active: boolean;
  onToggle: () => void;
  className?: string;
}

export function ShowTranslationsToggle({ active, onToggle, className = '' }: ShowTranslationsToggleProps) {
  return (
    <button
      type="button"
      className={`btn btn--sm app-header__translations${active ? ' btn--primary' : ' btn--secondary'}${className ? ` ${className}` : ''}`}
      onClick={onToggle}
      aria-pressed={active}
      aria-label={active ? 'Ocultar traducciones' : 'Ver traducciones'}
      title={active ? 'Ocultar traducciones' : 'Ver traducciones'}
    >
      <span className="app-header__translations-icon" aria-hidden>👁</span>
      <span className="app-header__translations-label">
        {active ? 'Ocultar trad.' : 'Ver trad.'}
      </span>
    </button>
  );
}
