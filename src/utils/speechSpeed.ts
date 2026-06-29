export type SpeechSpeed = 'slow' | 'normal' | 'fast';

const STORAGE_KEY = 'french-drill-speech-speed';

export const SPEECH_SPEED_OPTIONS: { id: SpeechSpeed; label: string }[] = [
  { id: 'slow', label: 'Lento' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Rápido' },
];

export const SPEECH_SPEED_RATES: Record<SpeechSpeed, number> = {
  slow: 0.78,
  normal: 0.92,
  fast: 1.12,
};

export const SPEECH_PLAYBACK_RATES: Record<SpeechSpeed, number> = {
  slow: 0.85,
  normal: 1,
  fast: 1.2,
};

export function loadSpeechSpeed(): SpeechSpeed {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'slow' || saved === 'normal' || saved === 'fast') return saved;
  return 'normal';
}

export function saveSpeechSpeed(speed: SpeechSpeed): void {
  localStorage.setItem(STORAGE_KEY, speed);
}
