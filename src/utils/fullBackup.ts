import type { StudyLanguage } from '../config/languages';
import { LANGUAGES, getActiveLanguage, setActiveLanguage } from '../config/languages';
import type { AppState } from '../types';
import { importState, loadState, saveState } from './storage';
import { activateTranslationLang, persistTranslationCache } from './translate';

const ALL_LANGS = Object.keys(LANGUAGES) as StudyLanguage[];

export const FULL_BACKUP_VERSION = 1;

export interface StreakSnapshot {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
}

export interface LanguageBackupBundle {
  state: AppState;
  translations: Record<string, string>;
  manualTranslations: Record<string, string>;
  streak: StreakSnapshot;
}

export interface FullAppBackup {
  version: number;
  exportedAt: number;
  activeLanguage: StudyLanguage;
  languages: Partial<Record<StudyLanguage, LanguageBackupBundle>>;
}

export interface CloudUserRecord {
  updatedAt: number;
  backup: FullAppBackup;
}

export interface CloudBinRoot {
  users: Record<string, CloudUserRecord>;
}

const STREAK_KEY_PREFIX = 'french-drill-streak-';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function readStreak(lang: StudyLanguage): StreakSnapshot {
  return readJson(`${STREAK_KEY_PREFIX}${lang}`, {
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
  });
}

function writeStreak(lang: StudyLanguage, streak: StreakSnapshot): void {
  writeJson(`${STREAK_KEY_PREFIX}${lang}`, streak);
}

function readTranslationCaches(lang: StudyLanguage): {
  translations: Record<string, string>;
  manualTranslations: Record<string, string>;
} {
  return {
    translations: readJson(`french-drill-translations-${lang}`, {}),
    manualTranslations: readJson(`french-drill-manual-translations-${lang}`, {}),
  };
}

function writeTranslationCaches(
  lang: StudyLanguage,
  translations: Record<string, string>,
  manualTranslations: Record<string, string>,
): void {
  writeJson(`french-drill-translations-${lang}`, translations);
  writeJson(`french-drill-manual-translations-${lang}`, manualTranslations);
}

export function buildFullBackup(): FullAppBackup {
  const languages: Partial<Record<StudyLanguage, LanguageBackupBundle>> = {};

  for (const lang of ALL_LANGS) {
    const state = loadState(lang);
    const caches = readTranslationCaches(lang);

    languages[lang] = {
      state,
      translations: caches.translations,
      manualTranslations: caches.manualTranslations,
      streak: readStreak(lang),
    };
  }

  return {
    version: FULL_BACKUP_VERSION,
    exportedAt: Date.now(),
    activeLanguage: getActiveLanguage(),
    languages,
  };
}

export function applyFullBackup(backup: FullAppBackup): void {
  for (const lang of ALL_LANGS) {
    const bundle = backup.languages?.[lang];
    if (!bundle) continue;

    saveState(importState(JSON.stringify(bundle.state)), lang);
    writeTranslationCaches(lang, bundle.translations ?? {}, bundle.manualTranslations ?? {});
    writeStreak(lang, bundle.streak ?? { currentStreak: 0, longestStreak: 0, lastStudyDate: null });
  }

  if (backup.activeLanguage) {
    setActiveLanguage(backup.activeLanguage);
  }

  activateTranslationLang(getActiveLanguage());
  persistTranslationCache(getActiveLanguage());
}

export function emptyCloudBin(): CloudBinRoot {
  return { users: {} };
}

export function mergeUserBackup(
  root: CloudBinRoot | null,
  profileName: string,
  backup: FullAppBackup,
): CloudBinRoot {
  const base = root ?? emptyCloudBin();

  return {
    users: {
      ...base.users,
      [profileName]: {
        updatedAt: Date.now(),
        backup,
      },
    },
  };
}
