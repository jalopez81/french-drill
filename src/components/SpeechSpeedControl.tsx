import type { SpeechSpeed } from '../utils/speechSpeed';
import { SPEECH_SPEED_OPTIONS } from '../utils/speechSpeed';

interface SpeechSpeedControlProps {
  value: SpeechSpeed;
  onChange: (speed: SpeechSpeed) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function SpeechSpeedControl({
  value,
  onChange,
  disabled,
  compact = false,
}: SpeechSpeedControlProps) {
  return (
    <div
      className={`speech-speed${compact ? ' speech-speed--compact' : ''}`}
      role="group"
      aria-label="Velocidad de lectura"
    >
      {!compact && <span className="speech-speed__label">Velocidad</span>}
      <div className="speech-speed__options">
        {SPEECH_SPEED_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`speech-speed__btn ${value === option.id ? 'speech-speed__btn--active' : ''}`}
            onClick={() => onChange(option.id)}
            disabled={disabled}
            aria-pressed={value === option.id}
            aria-label={compact ? option.label : undefined}
            title={compact ? option.label : undefined}
          >
            {compact ? option.label.charAt(0) : option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
