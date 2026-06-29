import { useRef } from 'react';
import type { SpeechMode } from '../hooks/useSpeech';
import type { StudyLanguage } from '../config/languages';
import { LANGUAGES } from '../config/languages';
import type { AppState } from '../types';
import type { VoiceGender } from '../utils/studyVoice';
import { listVoicesForGender } from '../utils/studyVoice';
import { exportState } from '../utils/storage';
import { VoiceGenderControl } from './VoiceGenderControl';
import { LanguageFlag } from './LanguageFlag';

interface SettingsViewProps {
  studyLanguage: StudyLanguage;
  onLanguageChange: (lang: StudyLanguage) => void;
  state: AppState;
  onImport: (json: string) => void;
  studyVoice: SpeechSynthesisVoice | null;
  studyVoices: SpeechSynthesisVoice[];
  voiceGender: VoiceGender;
  onSelectVoiceGender: (gender: VoiceGender) => void;
  onSelectVoice: (voice: SpeechSynthesisVoice) => void;
  onTestVoice: () => void;
  speechMode: SpeechMode;
  canUseNativeSpeech: boolean;
  systemVoiceCount: number;
}

export function SettingsView({
  studyLanguage,
  onLanguageChange,
  state,
  onImport,
  studyVoice,
  studyVoices,
  voiceGender,
  onSelectVoiceGender,
  onSelectVoice,
  onTestVoice,
  speechMode,
  canUseNativeSpeech,
  systemVoiceCount,
}: SettingsViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const langConfig = LANGUAGES[studyLanguage];
  const genderVoices = listVoicesForGender(studyLanguage, voiceGender);

  const handleExport = () => {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `french-drill-${studyLanguage}-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (file: File) => {
    if (
      !window.confirm(
        '¿Importar este backup?\n\nSe reemplazarán todas las lecciones y el vocabulario del idioma actual.',
      )
    ) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImport(String(reader.result));
      } catch {
        alert('No se pudo importar el backup. Verifica el archivo.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="settings-view">
      <section className="card">
        <h2 className="card__title">Idioma de estudio</h2>
        <p className="hint">
          Al cambiar de idioma se guarda automáticamente tu progreso actual en este dispositivo.
          Al volver, se restaura todo (lecciones, vocabulario y memoria).
        </p>
        <label className="field">
          <span className="field__label">Idioma activo</span>
          <div className="lang-select-row">
            <LanguageFlag
              lang={studyLanguage}
              className="language-flag language-flag--select"
              title={langConfig.label}
            />
            <select
              className="select lang-select-row__select"
              value={studyLanguage}
              onChange={(e) => onLanguageChange(e.target.value as StudyLanguage)}
            >
              {(Object.keys(LANGUAGES) as StudyLanguage[]).map((code) => (
                <option key={code} value={code}>
                  {LANGUAGES[code].label}
                </option>
              ))}
            </select>
          </div>
        </label>
      </section>

      <section className="card">
        <h2 className="card__title">Pronunciación</h2>
        <p className="hint">
          Elige el tipo de voz para {langConfig.label.toLowerCase()}. Con voz del dispositivo, cada
          pronunciación usa una variante aleatoria del tipo elegido.
        </p>
        <VoiceGenderControl
          value={voiceGender}
          onChange={onSelectVoiceGender}
          disabled={!canUseNativeSpeech || studyVoices.length === 0}
        />
        {studyVoice && speechMode === 'native' && genderVoices.length > 1 && (
          <p className="hint">
            Voces disponibles ({voiceGender === 'female' ? 'mujer' : 'hombre'}):{' '}
            <strong>{genderVoices.length}</strong> — se alternan al azar.
          </p>
        )}
        {studyVoice && (speechMode !== 'native' || genderVoices.length <= 1) && (
          <p className="hint">
            Voz de referencia: <strong>{studyVoice.name}</strong>
          </p>
        )}
        {!studyVoice && (
          <p className="hint hint--warning">
            {!canUseNativeSpeech
              ? 'El navegador bloquea la voz del sistema fuera de HTTPS. Abre la app con https:// o localhost.'
              : systemVoiceCount === 0
                ? 'El navegador aún no cargó las voces. Espera unos segundos y recarga la página.'
                : studyVoices.length === 0
                  ? `Se detectaron ${systemVoiceCount} voces, pero ninguna en ${langConfig.label.toLowerCase()}. En Windows: Configuración → Hora e idioma → Voz, instala «Francés (Francia)», reinicia el navegador y vuelve aquí.`
                  : `No se detectó una voz de ${langConfig.label.toLowerCase()} en este dispositivo. Instala una voz en los ajustes del sistema.`}
          </p>
        )}
        {genderVoices.length > 1 && (
          <label className="field">
            <span className="field__label">Variante</span>
            <select
              className="select"
              value={studyVoice ? `${studyVoice.name}::${studyVoice.lang}` : ''}
              onChange={(e) => {
                const voice = genderVoices.find(
                  (item) => `${item.name}::${item.lang}` === e.target.value,
                );
                if (voice) onSelectVoice(voice);
              }}
            >
              {genderVoices.map((voice) => (
                <option key={`${voice.name}-${voice.lang}`} value={`${voice.name}::${voice.lang}`}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="btn btn--secondary" onClick={onTestVoice}>
          Probar voz
        </button>
        <p className="hint">
          Modo actual:{' '}
          <strong>{speechMode === 'native' ? 'Voz del dispositivo' : 'Audio en línea (Lingva)'}</strong>
        </p>
        {speechMode === 'online' && (
          <p className="hint hint--warning">
            En modo en línea no puedes elegir mujer u hombre. Usa <strong>https://</strong> y
            instala voces del idioma en tu dispositivo para activar la voz nativa.
          </p>
        )}
        {!canUseNativeSpeech && (
          <p className="hint hint--warning">
            En el celular por red, el navegador suele bloquear la voz del sistema sin HTTPS. Usa{' '}
            <strong>https://</strong> al abrir la app (el servidor de desarrollo ya lo habilita) o deja que use audio en línea.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Backup</h2>
        <p className="hint">
          Exporta el estado del idioma actual (lecciones y vocabulario) para restaurarlo después.
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={handleExport}>
            Exportar backup
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => fileRef.current?.click()}
          >
            Importar backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      <section className="card card--muted">
        <h2 className="card__title">Resumen</h2>
        <div className="stats-row">
          <div className="stat">
            <span className="stat__value">{state.savedTexts.length}</span>
            <span className="stat__label">Lecciones</span>
          </div>
          <div className="stat">
            <span className="stat__value">{state.vocabulary.length}</span>
            <span className="stat__label">Palabras</span>
          </div>
        </div>
      </section>
    </div>
  );
}
