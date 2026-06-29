import type { StudyLanguage } from '../config/languages';
import { LINGVA_INSTANCES } from './lingva';
import { LANGUAGES, TARGET_LANG } from '../config/languages';

type TranslationCache = Record<string, string>;

const memoryCaches: Record<StudyLanguage, TranslationCache> = { fr: {}, en: {} };
let activeLang: StudyLanguage = 'fr';

function cacheStorageKey(lang: StudyLanguage): string {
  return `french-drill-translations-${lang}`;
}

function readCache(lang: StudyLanguage): TranslationCache {
  try {
    return JSON.parse(localStorage.getItem(cacheStorageKey(lang)) ?? '{}') as TranslationCache;
  } catch {
    return {};
  }
}

function writeCache(lang: StudyLanguage): void {
  localStorage.setItem(cacheStorageKey(lang), JSON.stringify(memoryCaches[lang]));
}

export function activateTranslationLang(lang: StudyLanguage): void {
  if (activeLang !== lang) {
    writeCache(activeLang);
  }
  activeLang = lang;
  memoryCaches[lang] = readCache(lang);
}

export function persistTranslationCache(lang: StudyLanguage = activeLang): void {
  writeCache(lang);
}

export function getCachedTranslation(text: string): string | null {
  const key = text.trim();
  return memoryCaches[activeLang][key] ?? null;
}

export function cacheTranslation(text: string, translation: string): void {
  const key = text.trim();
  if (!key || !translation.trim()) return;
  memoryCaches[activeLang][key] = translation.trim();
  writeCache(activeLang);
}

async function fetchTranslation(text: string, sourceLang: StudyLanguage): Promise<string> {
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

export async function translateToSpanish(text: string): Promise<string> {
  const key = text.trim();
  if (!key) return '';

  const cached = getCachedTranslation(key);
  if (cached) return cached;

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

  try {
    const payload = missing.join('\n');
    const translatedPayload = await fetchTranslation(payload, activeLang);
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
