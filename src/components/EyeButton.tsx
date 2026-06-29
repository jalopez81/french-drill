interface EyeButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

export function EyeButton({ active, onClick, label }: EyeButtonProps) {
  return (
    <button
      type="button"
      className={`eye-btn ${active ? 'eye-btn--active' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      aria-pressed={active}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path
          fill="currentColor"
          d="M12 5C7 5 2.73 8.11 1 12.5 2.73 16.89 7 20 12 20s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5zm0 11.5a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"
        />
      </svg>
    </button>
  );
}
