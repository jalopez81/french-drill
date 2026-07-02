import { useEffect, useState } from 'react';
import { isValidProfileName, normalizeProfileName } from '../utils/cloudProfiles';

interface ProfilePickerDialogProps {
  open: boolean;
  title: string;
  message: string;
  profiles: string[];
  confirmLabel?: string;
  allowNew?: boolean;
  onConfirm: (profileName: string) => void;
  onCancel: () => void;
}

export function ProfilePickerDialog({
  open,
  title,
  message,
  profiles,
  confirmLabel = 'Confirmar',
  allowNew = true,
  onConfirm,
  onCancel,
}: ProfilePickerDialogProps) {
  const [selected, setSelected] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(profiles[0] ?? '');
    setNewName('');
    setError(null);
  }, [open, profiles]);

  if (!open) return null;

  const resolvedName = allowNew && newName.trim() ? normalizeProfileName(newName) : selected;

  const handleConfirm = () => {
    if (!resolvedName) {
      setError('Elige o escribe un nombre de usuario');
      return;
    }
    if (!isValidProfileName(resolvedName)) {
      setError('Nombre inválido (2–32 caracteres: letras, números, _ o -)');
      return;
    }
    onConfirm(resolvedName);
  };

  return (
    <div className="confirm-overlay" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog profile-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="profile-picker-title" className="confirm-dialog__title">
          {title}
        </h3>
        <p className="confirm-dialog__message">{message}</p>

        {profiles.length > 0 && (
          <label className="field">
            <span className="field__label">Usuarios en este dispositivo</span>
            <select
              className="select"
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                setNewName('');
                setError(null);
              }}
            >
              {profiles.map((profile) => (
                <option key={profile} value={profile}>
                  {profile}
                </option>
              ))}
            </select>
          </label>
        )}

        {allowNew && (
          <label className="field">
            <span className="field__label">
              {profiles.length > 0 ? 'O crear uno nuevo' : 'Nombre de usuario'}
            </span>
            <input
              type="text"
              className="select"
              value={newName}
              onChange={(event) => {
                setNewName(event.target.value);
                setError(null);
              }}
              placeholder="ej. juan"
              autoComplete="off"
              autoFocus={profiles.length === 0}
            />
          </label>
        )}

        {error && <p className="hint hint--warning">{error}</p>}

        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={handleConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
