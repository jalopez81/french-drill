import { useRef } from 'react';
import type { SpeechMode } from '../hooks/useSpeech';
import type { StudyLanguage } from '../config/languages';
import { LANGUAGES } from '../config/languages';
import type { AppState } from '../types';
import type { VoiceGender } from '../utils/studyVoice';
import { formatVoiceLabel, voiceKey } from '../utils/studyVoice';
import type { TranslationProvider } from '../utils/translate';
import { exportState } from '../utils/storage';
import { exportVocabularyCsv, exportVocabularyJson, downloadTextFile } from '../utils/exportVocabulary';
import type { Theme } from '../hooks/useTheme';
import { VoiceGenderControl } from './VoiceGenderControl';
import { LanguageFlag } from './LanguageFlag';
import { useConfirm } from '../hooks/useConfirm';

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
  onClearVoice: () => void;
  onReloadVoices: () => void;
  onTestVoice: () => void;
  speechMode: SpeechMode;
  canUseNativeSpeech: boolean;
  systemVoiceCount: number;
  translationProvider: TranslationProvider;
  onTranslationProviderChange: (provider: TranslationProvider) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onResetAll: () => void | Promise<void>;
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
  onClearVoice,
  onReloadVoices,
  onTestVoice,
  speechMode,
  canUseNativeSpeech,
  systemVoiceCount,
  translationProvider,
  onTranslationProviderChange,
  theme,
  onThemeChange,
  onResetAll,
}: SettingsViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm } = useConfirm();
  const langConfig = LANGUAGES[studyLanguage];

  const handleExport = () => {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `french-drill-${studyLanguage}-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    const confirmed = await confirm({
      title: 'Importar backup',
      message:
        'Se reemplazarán todas las lecciones y el vocabulario del idioma actual. ¿Continuar?',
      confirmLabel: 'Importar',
      variant: 'danger',
    });
    if (!confirmed) return;

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

  const dateStamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="settings-view">
      <section className="card">
        <h2 className="card__title">Apariencia</h2>
        <label className="field">
          <span className="field__label">Tema</span>
          <select
            className="select"
            value={theme}
            onChange={(event) => onThemeChange(event.target.value as Theme)}
          >
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select>
        </label>
      </section>

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
        <h2 className="card__title">Traducciones</h2>
        <p className="hint">
          Elige el servicio para traducir oraciones y palabras. Las traducciones manuales se
          conservan aunque cambies de servicio.
        </p>
        <label className="field">
          <span className="field__label">Servicio de traducción</span>
          <select
            className="select"
            value={translationProvider}
            onChange={(e) => onTranslationProviderChange(e.target.value as TranslationProvider)}
          >
            <option value="lingva">Lingva (predeterminado)</option>
            <option value="google">Google Translate</option>
          </select>
        </label>
        {translationProvider === 'google' && (
          <p className="hint">
            Usa el endpoint público de Google Translate. Si falla, la app vuelve a Lingva
            automáticamente.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Pronunciación</h2>
        <p className="hint">
          Elige una voz de {langConfig.label.toLowerCase()} para pronunciar. Solo se listan voces
          cuyo idioma coincide con el de estudio.
        </p>
        <VoiceGenderControl
          value={voiceGender}
          onChange={onSelectVoiceGender}
          disabled={!canUseNativeSpeech || studyVoices.length === 0}
        />
        {studyVoice && (
          <p className="hint">
            Voz activa: <strong>{formatVoiceLabel(studyVoice)}</strong>
          </p>
        )}
        {!studyVoice && (
          <p className="hint hint--warning">
            {!canUseNativeSpeech
              ? 'El navegador bloquea la voz del sistema fuera de HTTPS. Abre la app con https:// o localhost.'
              : systemVoiceCount === 0
                ? 'El navegador aún no cargó las voces. Usa «Recargar voces» o espera unos segundos.'
                : studyVoices.length === 0
                  ? `Se detectaron ${systemVoiceCount} voces, pero ninguna en ${langConfig.label.toLowerCase()}. Instala una voz del idioma en los ajustes del sistema.`
                  : `No hay voz de ${langConfig.label.toLowerCase()} seleccionada.`}
          </p>
        )}
        {studyVoices.length > 0 && (
          <label className="field">
            <span className="field__label">Voz del idioma</span>
            <select
              className="select"
              value={studyVoice ? voiceKey(studyVoice) : ''}
              onChange={(e) => {
                const voice = studyVoices.find((item) => voiceKey(item) === e.target.value);
                if (voice) onSelectVoice(voice);
              }}
            >
              {!studyVoice && <option value="">Selecciona una voz…</option>}
              {studyVoices.map((voice) => (
                <option key={voiceKey(voice)} value={voiceKey(voice)}>
                  {formatVoiceLabel(voice)}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn--secondary" onClick={onTestVoice}>
            Probar voz
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onReloadVoices}
            disabled={!canUseNativeSpeech}
          >
            Recargar voces
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClearVoice}
            disabled={!studyVoice}
          >
            Quitar voz
          </button>
        </div>
        <p className="hint">
          Modo actual:{' '}
          <strong>{speechMode === 'native' ? 'Voz del dispositivo' : 'Audio en línea (Lingva)'}</strong>
        </p>
        {speechMode === 'online' && (
          <p className="hint hint--warning">
            En modo en línea no puedes elegir voz del sistema. Usa <strong>https://</strong>, instala
            voces del idioma y pulsa <strong>Recargar voces</strong>.
          </p>
        )}
        {!canUseNativeSpeech && (
          <p className="hint hint--warning">
            En el celular por red, el navegador suele bloquear la voz del sistema sin HTTPS.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Backup y exportación</h2>
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
              if (file) void handleImportFile(file);
              e.target.value = '';
            }}
          />
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() =>
              downloadTextFile(
                exportVocabularyJson(state.vocabulary),
                `vocabulario-${studyLanguage}-${dateStamp}.json`,
                'application/json',
              )
            }
          >
            Exportar vocabulario (JSON)
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() =>
              downloadTextFile(
                exportVocabularyCsv(state.vocabulary),
                `vocabulario-${studyLanguage}-${dateStamp}.csv`,
                'text/csv',
              )
            }
          >
            Exportar vocabulario (CSV)
          </button>
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

      <section className="card settings-danger-zone">
        <h2 className="card__title">Zona de peligro</h2>
        <p className="hint">
          Borra todas las lecciones, vocabulario, progreso de memoria, cachés de traducción y audios
          en todos los idiomas. Exporta un backup antes si quieres conservar tus datos.
        </p>
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => void onResetAll()}
        >
          Limpiar y resetear todo
        </button>
      </section>
    </div>
  );
}
