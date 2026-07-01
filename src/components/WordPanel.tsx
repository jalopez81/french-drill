import { useEffect, useState } from 'react';
import type { SpeakOptions } from '../hooks/useSpeech';
import { formatVoiceLabel, voiceKey } from '../utils/studyVoice';

interface WordPanelProps {
  word: string | null;
  translation: string | null;
  translationLoading: boolean;
  translationError: boolean;
  isManualTranslation: boolean;
  studyVoices: SpeechSynthesisVoice[];
  wordVoiceKey: string | null;
  speechMode: 'native' | 'online';
  onClose: () => void;
  onSpeak: (text: string, options?: SpeakOptions) => void;
  onSelectWordVoice: (word: string, voice: SpeechSynthesisVoice | null) => void;
  onSaveManualTranslation: (word: string, translation: string) => void;
  onRefetchTranslation: (word: string) => void;
  onStop: () => void;
  speaking: boolean;
}

export function WordPanel({
  word,
  translation,
  translationLoading,
  translationError,
  isManualTranslation,
  studyVoices,
  wordVoiceKey,
  speechMode,
  onClose,
  onSpeak,
  onSelectWordVoice,
  onSaveManualTranslation,
  onRefetchTranslation,
  onStop,
  speaking,
}: WordPanelProps) {
  const [draftTranslation, setDraftTranslation] = useState('');

  useEffect(() => {
    setDraftTranslation(translation ?? '');
  }, [word, translation]);

  if (!word) return null;

  const canSaveManual = draftTranslation.trim().length > 0 && draftTranslation.trim() !== translation?.trim();

  return (
    <>
      <button type="button" className="sheet-backdrop" onClick={onClose} aria-label="Cerrar panel" />
      <div className="word-panel" role="dialog" aria-label="Detalle de palabra">
        <div className="word-panel__handle" aria-hidden />
        <div className="word-panel__header">
          <span className="pill pill--purple">Palabra</span>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <p className="word-panel__word">{word}</p>
        <label className="field field--compact">
          <span className="field__label">
            Traducción
            {isManualTranslation && <span className="word-panel__manual-tag"> · manual</span>}
          </span>
          <input
            type="text"
            className="title-input"
            placeholder={translationLoading ? 'Traduciendo…' : 'Escribe la traducción…'}
            value={draftTranslation}
            onChange={(e) => setDraftTranslation(e.target.value)}
            disabled={translationLoading}
          />
        </label>
        {translationError && !translationLoading && (
          <p className="hint hint--warning">No se pudo traducir automáticamente.</p>
        )}
        <div className="btn-row word-panel__translation-actions">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => onSaveManualTranslation(word, draftTranslation)}
            disabled={!canSaveManual}
          >
            Guardar traducción
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onRefetchTranslation(word)}
            disabled={translationLoading}
          >
            Traducir de nuevo
          </button>
        </div>
        {speechMode === 'native' && studyVoices.length > 0 && (
          <label className="field field--compact">
            <span className="field__label">Voz para esta palabra</span>
            <select
              className="select"
              value={wordVoiceKey ?? ''}
              onChange={(e) => {
                const key = e.target.value;
                if (!key) {
                  onSelectWordVoice(word, null);
                  return;
                }
                const voice = studyVoices.find((item) => voiceKey(item) === key);
                if (voice) onSelectWordVoice(word, voice);
              }}
            >
              <option value="">Voz predeterminada</option>
              {studyVoices.map((voice) => (
                <option key={voiceKey(voice)} value={voiceKey(voice)}>
                  {formatVoiceLabel(voice)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          className={`btn btn--block ${speaking ? 'btn--danger' : 'btn--primary'}`}
          onClick={() => {
            if (speaking) {
              onStop();
              return;
            }
            onSpeak(word, { word });
          }}
        >
          {speaking ? '■ Detener' : '▶ Pronunciar palabra'}
        </button>
      </div>
    </>
  );
}

export function WordPanelContainer({
  word,
  getTranslation,
  isTranslationLoading,
  hasTranslationError,
  isManualTranslation,
  fetchTranslation,
  onSaveManualTranslation,
  onRefetchTranslation,
  studyVoices,
  wordVoiceKey,
  speechMode,
  onClose,
  onSpeak,
  onSelectWordVoice,
  onStop,
  speaking,
}: {
  word: string | null;
  getTranslation: (text: string) => string | null;
  isTranslationLoading: (text: string) => boolean;
  hasTranslationError: (text: string) => boolean;
  isManualTranslation: (text: string) => boolean;
  fetchTranslation: (text: string, options?: { force?: boolean }) => void;
  onSaveManualTranslation: (word: string, translation: string) => void;
  onRefetchTranslation: (word: string) => void;
  studyVoices: SpeechSynthesisVoice[];
  wordVoiceKey: string | null;
  speechMode: 'native' | 'online';
  onClose: () => void;
  onSpeak: (text: string, options?: SpeakOptions) => void;
  onSelectWordVoice: (word: string, voice: SpeechSynthesisVoice | null) => void;
  onStop: () => void;
  speaking: boolean;
}) {
  const [voiceRevision, setVoiceRevision] = useState(0);

  useEffect(() => {
    if (!word) return;
    fetchTranslation(word);
    void onSpeak(word, { word });
  }, [word, fetchTranslation, onSpeak, voiceRevision]);

  return (
    <WordPanel
      word={word}
      translation={word ? getTranslation(word) : null}
      translationLoading={word ? isTranslationLoading(word) : false}
      translationError={word ? hasTranslationError(word) : false}
      isManualTranslation={word ? isManualTranslation(word) : false}
      studyVoices={studyVoices}
      wordVoiceKey={wordVoiceKey}
      speechMode={speechMode}
      onClose={onClose}
      onSpeak={onSpeak}
      onSaveManualTranslation={onSaveManualTranslation}
      onRefetchTranslation={onRefetchTranslation}
      onSelectWordVoice={(selectedWord, voice) => {
        onSelectWordVoice(selectedWord, voice);
        setVoiceRevision((value) => value + 1);
      }}
      onStop={onStop}
      speaking={speaking}
    />
  );
}
