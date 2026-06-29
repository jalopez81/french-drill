import type { SpeechSpeed } from '../utils/speechSpeed';
import { SPEECH_SPEED_OPTIONS } from '../utils/speechSpeed';

interface SpeechSpeedControlProps {
  value: SpeechSpeed;
  onChange: (speed: SpeechSpeed) => void;
  disabled?: boolean;
}

export function SpeechSpeedControl({ value, onChange, disabled }: SpeechSpeedControlProps) {
  return (
    <div className="speech-speed" role="group" aria-label="Velocidad de lectura">
      <span className="speech-speed__label">Velocidad</span>
      <div className="speech-speed__options">
        {SPEECH_SPEED_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`speech-speed__btn ${value === option.id ? 'speech-speed__btn--active' : ''}`}
            onClick={() => onChange(option.id)}
            disabled={disabled}
            aria-pressed={value === option.id}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
