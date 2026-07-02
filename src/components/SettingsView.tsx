import { useRef, useState } from 'react';
import type { StudyLanguage } from '../config/languages';
import { LANGUAGES } from '../config/languages';
import type { AppState } from '../types';
import type { VoiceGender } from '../utils/studyVoice';
import { formatVoiceLabel, voiceKey } from '../utils/studyVoice';
import { exportState } from '../utils/storage';
import type { Theme } from '../hooks/useTheme';
import { VoiceGenderControl } from './VoiceGenderControl';
import { LanguageFlag } from './LanguageFlag';
import { useConfirm } from '../hooks/useConfirm';
import { useStorage } from '../hooks/useStorage';
import { isJsonBinConfigured } from '../utils/jsonbinClient';
import {
  addLocalProfile,
  getActiveProfile,
  getLocalProfiles,
  removeLocalProfile,
  setActiveProfile,
} from '../utils/cloudProfiles';
import {
  buildFullBackup,
  mergeUserBackup,
  type CloudBinRoot,
  type FullAppBackup,
} from '../utils/fullBackup';
import { ProfilePickerDialog } from './ProfilePickerDialog';

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
  usesOnlineAudio: boolean;
  canUseNativeSpeech: boolean;
  systemVoiceCount: number;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onResetAll: () => void | Promise<void>;
  onFullRestore: (backup: FullAppBackup) => void | Promise<void>;
  onActiveProfileChange?: () => void;
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
  usesOnlineAudio,
  canUseNativeSpeech,
  systemVoiceCount,
  theme,
  onThemeChange,
  onResetAll,
  onFullRestore,
  onActiveProfileChange,
}: SettingsViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm } = useConfirm();
  const langConfig = LANGUAGES[studyLanguage];
  const cloudConfigured = isJsonBinConfigured();
  const {
    data: cloudData,
    loading: cloudLoading,
    error: cloudError,
    fetchState: fetchCloudState,
    updateData: updateCloudData,
    flushUpdate: flushCloudUpdate,
  } = useStorage<CloudBinRoot>();

  const [localProfiles, setLocalProfiles] = useState(() => getLocalProfiles());
  const [activeProfile, setActiveProfileState] = useState(() => getActiveProfile());
  const [profilePickerMode, setProfilePickerMode] = useState<'upload' | 'download' | null>(null);
  const [cloudProfilesForPicker, setCloudProfilesForPicker] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshProfiles = () => {
    setLocalProfiles(getLocalProfiles());
    setActiveProfileState(getActiveProfile());
    onActiveProfileChange?.();
  };

  const showStatus = (message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 3500);
  };

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

  const handleCloudUpload = () => {
    if (!cloudConfigured) return;
    setCloudProfilesForPicker(localProfiles);
    setProfilePickerMode('upload');
  };

  const handleCloudDownload = async () => {
    if (!cloudConfigured) return;

    try {
      const record = await fetchCloudState();
      const cloudUsers = Object.keys(record?.users ?? {});
      const merged = [...new Set([...localProfiles, ...cloudUsers])];
      if (merged.length === 0) {
        alert('No hay usuarios en la nube ni en este dispositivo.');
        return;
      }
      setCloudProfilesForPicker(merged);
      setProfilePickerMode('download');
    } catch {
      alert('No se pudo leer la nube. Revisa la conexión y las claves de JSONBin.');
    }
  };

  const handleProfilePickerConfirm = async (profileName: string) => {
    const mode = profilePickerMode;
    setProfilePickerMode(null);

    try {
      addLocalProfile(profileName);
      setActiveProfile(profileName);
      refreshProfiles();

      if (mode === 'upload') {
        const confirmed = await confirm({
          title: 'Subir a la nube',
          message: `Se guardará el estado actual de todos los idiomas bajo el usuario «${profileName}». ¿Continuar?`,
          confirmLabel: 'Subir',
        });
        if (!confirmed) return;

        const currentCloud = cloudData ?? (await fetchCloudState());
        const merged = mergeUserBackup(currentCloud, profileName, buildFullBackup());
        updateCloudData(merged);
        await flushCloudUpdate();
        showStatus(`Datos subidos para «${profileName}»`);
        return;
      }

      if (mode === 'download') {
        const record = cloudData ?? (await fetchCloudState());
        const userRecord = record?.users?.[profileName];
        if (!userRecord?.backup) {
          alert(`No hay datos en la nube para «${profileName}».`);
          return;
        }

        const confirmed = await confirm({
          title: 'Bajar de la nube',
          message: `Se reemplazarán las lecciones y vocabulario locales con los datos de «${profileName}». ¿Continuar?`,
          confirmLabel: 'Importar',
          variant: 'danger',
        });
        if (!confirmed) return;

        await onFullRestore(userRecord.backup);
        showStatus(`Datos de «${profileName}» importados`);
      }
    } catch {
      alert('No se pudo sincronizar con JSONBin.');
    }
  };

  const handleAddProfile = async () => {
    const name = window.prompt('Nombre de usuario (sin contraseña):');
    if (!name) return;

    try {
      const normalized = addLocalProfile(name);
      setActiveProfile(normalized);
      refreshProfiles();
      showStatus(`Usuario «${normalized}» añadido`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Nombre inválido');
    }
  };

  const speechSourceLabel = usesOnlineAudio ? 'Lingva (en línea)' : 'Voz nativa del dispositivo';
  const speechSourceDetail = usesOnlineAudio
    ? 'Los audios se descargan de Lingva al pulsar ▶.'
    : studyVoice
      ? `Usando ${formatVoiceLabel(studyVoice)}.`
      : 'Selecciona una voz del idioma abajo.';

  return (
    <div className="settings-view">
      <section className="card">
        <h2 className="card__title">Datos y sincronización</h2>
        {statusMessage && <p className="hint settings-status">{statusMessage}</p>}

        <div className="settings-data-actions">
          {cloudConfigured && (
            <>
              <button
                type="button"
                className="btn btn--primary settings-data-actions__btn settings-data-actions__btn--icon"
                onClick={handleCloudUpload}
                disabled={cloudLoading}
                aria-label="Subir a la nube"
                title="Subir a la nube"
              >
                {cloudLoading ? '…' : '☁ ↑'}
              </button>
              <button
                type="button"
                className="btn btn--secondary settings-data-actions__btn settings-data-actions__btn--icon"
                onClick={() => void handleCloudDownload()}
                disabled={cloudLoading}
                aria-label="Bajar de la nube"
                title="Bajar de la nube"
              >
                ☁ ↓
              </button>
            </>
          )}
          <button type="button" className="btn btn--secondary settings-data-actions__btn" onClick={handleExport}>
            Exportar backup
          </button>
          <button
            type="button"
            className="btn btn--secondary settings-data-actions__btn"
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

        {!cloudConfigured && (
          <p className="hint hint--warning">
            Para sincronizar entre dispositivos configura <code>VITE_JSONBIN_BIN_ID</code> y{' '}
            <code>VITE_JSONBIN_ACCESS_KEY</code> en el entorno de despliegue.
          </p>
        )}
        {cloudError && <p className="hint hint--warning">{cloudError}</p>}

        <div className="settings-profiles">
          <div className="settings-profiles__header">
            <span className="field__label">Usuario local</span>
            {activeProfile ? (
              <span className="settings-profiles__active">{activeProfile}</span>
            ) : (
              <span className="hint">Sin usuario activo</span>
            )}
          </div>
          {localProfiles.length > 0 && (
            <div className="settings-profiles__list">
              {localProfiles.map((profile) => (
                <button
                  key={profile}
                  type="button"
                  className={`settings-profiles__chip${profile === activeProfile ? ' settings-profiles__chip--active' : ''}`}
                  onClick={() => {
                    setActiveProfile(profile);
                    refreshProfiles();
                  }}
                >
                  {profile}
                </button>
              ))}
            </div>
          )}
          <div className="btn-row">
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => void handleAddProfile()}>
              Añadir usuario
            </button>
            {activeProfile && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  removeLocalProfile(activeProfile);
                  refreshProfiles();
                }}
              >
                Quitar activo
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="card card--compact">
        <h2 className="card__title">Preferencias</h2>
        <div className="settings-prefs-row">
          <label className="settings-prefs-row__item">
            <span className="field__label">Idioma</span>
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
          <label className="settings-prefs-row__item">
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
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">Pronunciación</h2>
        <div
          className={`settings-speech-status${usesOnlineAudio ? ' settings-speech-status--online' : ' settings-speech-status--native'}`}
          role="status"
        >
          <span className="settings-speech-status__badge">
            {usesOnlineAudio ? '🌐 Lingva' : '📱 Nativa'}
          </span>
          <div className="settings-speech-status__body">
            <strong className="settings-speech-status__title">{speechSourceLabel}</strong>
            <span className="settings-speech-status__detail">{speechSourceDetail}</span>
          </div>
        </div>
        <p className="hint">
          Elige una voz de {langConfig.label.toLowerCase()} para pronunciar cuando el modo es nativo.
        </p>
        <VoiceGenderControl
          value={voiceGender}
          onChange={onSelectVoiceGender}
          disabled={!canUseNativeSpeech || studyVoices.length === 0}
        />
        {studyVoice && usesOnlineAudio && (
          <p className="hint">
            Voz preferida (solo modo nativo): <strong>{formatVoiceLabel(studyVoice)}</strong>
          </p>
        )}
        {!studyVoice && !usesOnlineAudio && (
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
        <div className="btn-row settings-voice-actions">
          <button type="button" className="btn btn--secondary btn--sm" onClick={onTestVoice}>
            Probar
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onReloadVoices}
            disabled={!canUseNativeSpeech}
          >
            Recargar voces
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onClearVoice}
            disabled={!studyVoice}
          >
            Quitar voz
          </button>
        </div>
        {usesOnlineAudio && studyVoices.length > 0 && canUseNativeSpeech && (
          <p className="hint hint--warning">
            Hay voces nativas disponibles. Selecciona una y pulsa Recargar voces para usar el modo
            nativo en lugar de Lingva.
          </p>
        )}
        {usesOnlineAudio && studyVoices.length === 0 && canUseNativeSpeech && (
          <p className="hint hint--warning">
            Sin voces del idioma instaladas. Instala una voz de {langConfig.label.toLowerCase()} o
            sigue usando Lingva.
          </p>
        )}
        {!canUseNativeSpeech && (
          <p className="hint hint--warning">
            El navegador bloquea la voz nativa fuera de HTTPS. Solo está disponible Lingva.
          </p>
        )}
      </section>

      <ProfilePickerDialog
        open={profilePickerMode !== null}
        title={profilePickerMode === 'upload' ? 'Subir: elegir usuario' : 'Bajar: elegir usuario'}
        message={
          profilePickerMode === 'upload'
            ? '¿Bajo qué nombre de usuario quieres guardar estos datos en la nube?'
            : '¿Qué usuario quieres restaurar en este dispositivo?'
        }
        profiles={cloudProfilesForPicker}
        confirmLabel={profilePickerMode === 'upload' ? 'Subir' : 'Importar'}
        allowNew={profilePickerMode === 'upload'}
        onConfirm={(profileName) => void handleProfilePickerConfirm(profileName)}
        onCancel={() => setProfilePickerMode(null)}
      />

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
