const PROFILES_KEY = 'french-drill-cloud-profiles';
const ACTIVE_PROFILE_KEY = 'french-drill-active-profile';

export function normalizeProfileName(name: string): string {
  return name.trim().toLowerCase();
}

export function isValidProfileName(name: string): boolean {
  const normalized = normalizeProfileName(name);
  return normalized.length >= 2 && normalized.length <= 32 && /^[a-z0-9_-]+$/.test(normalized);
}

export function getLocalProfiles(): string[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && isValidProfileName(item));
  } catch {
    return [];
  }
}

export function addLocalProfile(name: string): string {
  const normalized = normalizeProfileName(name);
  if (!isValidProfileName(normalized)) {
    throw new Error('Nombre inválido (2–32 caracteres: letras, números, _ o -)');
  }

  const profiles = getLocalProfiles();
  if (!profiles.includes(normalized)) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify([normalized, ...profiles]));
  }

  return normalized;
}

export function getActiveProfile(): string | null {
  const active = localStorage.getItem(ACTIVE_PROFILE_KEY);
  return active && isValidProfileName(active) ? active : null;
}

export function setActiveProfile(name: string): void {
  const normalized = addLocalProfile(name);
  localStorage.setItem(ACTIVE_PROFILE_KEY, normalized);
}

export function removeLocalProfile(name: string): void {
  const normalized = normalizeProfileName(name);
  const profiles = getLocalProfiles().filter((item) => item !== normalized);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));

  if (getActiveProfile() === normalized) {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
}
