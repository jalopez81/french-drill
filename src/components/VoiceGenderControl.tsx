import type { VoiceGender } from '../utils/studyVoice';

interface VoiceGenderControlProps {
  value: VoiceGender;
  onChange: (gender: VoiceGender) => void;
  disabled?: boolean;
  compact?: boolean;
}

const options: { id: VoiceGender; label: string }[] = [
  { id: 'female', label: 'Mujer' },
  { id: 'male', label: 'Hombre' },
];

export function VoiceGenderControl({
  value,
  onChange,
  disabled,
  compact,
}: VoiceGenderControlProps) {
  return (
    <div
      className={`voice-gender${compact ? ' voice-gender--compact' : ''}`}
      role="group"
      aria-label="Tipo de voz para pronunciación"
    >
      {!compact && <span className="voice-gender__label">Tipo de voz</span>}
      <div className="voice-gender__options">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`voice-gender__btn ${value === option.id ? 'voice-gender__btn--active' : ''}`}
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
