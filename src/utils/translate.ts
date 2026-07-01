import type { StudyLanguage } from '../config/languages';
import { LINGVA_INSTANCES } from './lingva';
import { LANGUAGES, TARGET_LANG } from '../config/languages';

export type TranslationProvider = 'lingva' | 'google';

type TranslationCache = Record<string, string>;

const PROVIDER_STORAGE_KEY = 'french-drill-translation-provider';

const memoryCaches: Record<StudyLanguage, TranslationCache> = { fr: {}, en: {} };
const manualCaches: Record<StudyLanguage, TranslationCache> = { fr: {}, en: {} };
let activeLang: StudyLanguage = 'fr';
let activeProvider: TranslationProvider = 'lingva';

function cacheStorageKey(lang: StudyLanguage): string {
  return `french-drill-translations-${lang}`;
}

function manualStorageKey(lang: StudyLanguage): string {
  return `french-drill-manual-translations-${lang}`;
}

export function loadTranslationProvider(): TranslationProvider {
  try {
    const saved = localStorage.getItem(PROVIDER_STORAGE_KEY);
    return saved === 'google' ? 'google' : 'lingva';
  } catch {
    return 'lingva';
  }
}

export function getTranslationProvider(): TranslationProvider {
  return activeProvider;
}

export function setTranslationProvider(provider: TranslationProvider): void {
  activeProvider = provider;
  try {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
  } catch {
    // no-op
  }
}

export function initTranslationProvider(): TranslationProvider {
  activeProvider = loadTranslationProvider();
  return activeProvider;
}

function readCache(lang: StudyLanguage): TranslationCache {
  try {
    return JSON.parse(localStorage.getItem(cacheStorageKey(lang)) ?? '{}') as TranslationCache;
  } catch {
    return {};
  }
}

function readManualCache(lang: StudyLanguage): TranslationCache {
  try {
    return JSON.parse(localStorage.getItem(manualStorageKey(lang)) ?? '{}') as TranslationCache;
  } catch {
    return {};
  }
}

function writeCache(lang: StudyLanguage): void {
  localStorage.setItem(cacheStorageKey(lang), JSON.stringify(memoryCaches[lang]));
}

function writeManualCache(lang: StudyLanguage): void {
  localStorage.setItem(manualStorageKey(lang), JSON.stringify(manualCaches[lang]));
}

export function activateTranslationLang(lang: StudyLanguage): void {
  if (activeLang !== lang) {
    writeCache(activeLang);
    writeManualCache(activeLang);
  }
  activeLang = lang;
  memoryCaches[lang] = readCache(lang);
  manualCaches[lang] = readManualCache(lang);
}

export function persistTranslationCache(lang: StudyLanguage = activeLang): void {
  writeCache(lang);
  writeManualCache(lang);
}

export function isManualTranslation(text: string): boolean {
  const key = text.trim();
  return Boolean(manualCaches[activeLang][key]);
}

export function getCachedTranslation(text: string): string | null {
  const key = text.trim();
  return manualCaches[activeLang][key] ?? memoryCaches[activeLang][key] ?? null;
}

export function cacheTranslation(text: string, translation: string): void {
  const key = text.trim();
  if (!key || !translation.trim()) return;
  memoryCaches[activeLang][key] = translation.trim();
  writeCache(activeLang);
}

export function setManualTranslation(text: string, translation: string): void {
  const key = text.trim();
  const value = translation.trim();
  if (!key || !value) return;

  manualCaches[activeLang][key] = value;
  memoryCaches[activeLang][key] = value;
  writeManualCache(activeLang);
  writeCache(activeLang);
}

export function clearManualTranslation(text: string): void {
  const key = text.trim();
  delete manualCaches[activeLang][key];
  writeManualCache(activeLang);
}

export function removeCachedTranslation(text: string): void {
  const key = text.trim();
  delete manualCaches[activeLang][key];
  delete memoryCaches[activeLang][key];
  writeManualCache(activeLang);
  writeCache(activeLang);
}

async function fetchLingvaTranslation(text: string, sourceLang: StudyLanguage): Promise<string> {
  const sourceCode = LANGUAGES[sourceLang].lingvaCode;
  let lastError: unknown;

  for (const instance of LINGVA_INSTANCES) {
    try {
      const url = `${instance}/api/v1/${sourceCode}/${TARGET_LANG}/${encodeURIComponent(text)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        translation?: string;
        error?: string;
      };

      const translated = data.translation?.trim() ?? '';
      if (!translated) {
        throw new Error(data.error ?? 'Traducción vacía');
      }

      return translated;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No se pudo traducir');
}

async function fetchGoogleTranslation(text: string, sourceLang: StudyLanguage): Promise<string> {
  const sourceCode = LANGUAGES[sourceLang].lingvaCode;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${TARGET_LANG}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Formato inesperado de Google Translate');
  }

  const translated = (data[0] as Array<[string]>)
    .map((part) => part[0] ?? '')
    .join('')
    .trim();

  if (!translated) {
    throw new Error('Traducción vacía');
  }

  return translated;
}

async function fetchTranslation(text: string, sourceLang: StudyLanguage): Promise<string> {
  if (activeProvider === 'google') {
    try {
      return await fetchGoogleTranslation(text, sourceLang);
    } catch {
      return fetchLingvaTranslation(text, sourceLang);
    }
  }

  return fetchLingvaTranslation(text, sourceLang);
}

export async function translateToSpanish(text: string, options?: { force?: boolean }): Promise<string> {
  const key = text.trim();
  if (!key) return '';

  if (!options?.force) {
    const cached = getCachedTranslation(key);
    if (cached) return cached;
  }

  const translated = await fetchTranslation(key, activeLang);
  cacheTranslation(key, translated);
  return translated;
}

async function translateIndividually(items: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const item of items) {
    const translation = await translateToSpanish(item);
    result[item] = translation;
  }

  return result;
}

export async function translateBulk(items: string[]): Promise<Record<string, string>> {
  const keys = [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  const result: Record<string, string> = {};

  for (const key of keys) {
    const cached = getCachedTranslation(key);
    if (cached) result[key] = cached;
  }

  const missing = keys.filter((key) => !result[key]);
  if (missing.length === 0) return result;

  if (missing.length === 1) {
    const translation = await translateToSpanish(missing[0]);
    result[missing[0]] = translation;
    return result;
  }

  if (activeProvider === 'lingva') {
    try {
      const payload = missing.join('\n');
      const translatedPayload = await fetchLingvaTranslation(payload, activeLang);
      const parts = translatedPayload.split('\n');

      if (parts.length === missing.length) {
        missing.forEach((key, index) => {
          const translation = parts[index].trim();
          cacheTranslation(key, translation);
          result[key] = translation;
        });
        return result;
      }
    } catch {
      // fallback below
    }
  }

  const fallback = await translateIndividually(missing);
  return { ...result, ...fallback };
}

export function migrateLegacyTranslationCache(): void {
  try {
    const legacy = localStorage.getItem('french-drill-translations');
    if (legacy && !localStorage.getItem(cacheStorageKey('fr'))) {
      localStorage.setItem(cacheStorageKey('fr'), legacy);
      localStorage.removeItem('french-drill-translations');
    }
  } catch {
    // no-op
  }
}
