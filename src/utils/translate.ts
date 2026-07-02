import type { StudyLanguage } from '../config/languages';
import { translateWithGemini } from './geminiTranslate';

type TranslationCache = Record<string, string>;

export interface BulkTranslationResult {
  translations: Record<string, string>;
}

export interface TranslateBulkOptions {
  lessonSentences?: string[];
}

const memoryCaches: Record<StudyLanguage, TranslationCache> = { fr: {}, en: {} };
const manualCaches: Record<StudyLanguage, TranslationCache> = { fr: {}, en: {} };
let activeLang: StudyLanguage = 'fr';

function cacheStorageKey(lang: StudyLanguage): string {
  return `french-drill-translations-${lang}`;
}

function manualStorageKey(lang: StudyLanguage): string {
  return `french-drill-manual-translations-${lang}`;
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

export function clearAllTranslationData(): void {
  for (const lang of ['fr', 'en'] as StudyLanguage[]) {
    memoryCaches[lang] = {};
    manualCaches[lang] = {};
    localStorage.removeItem(cacheStorageKey(lang));
    localStorage.removeItem(manualStorageKey(lang));
  }
  localStorage.removeItem('french-drill-translations');
  localStorage.removeItem('french-drill-translation-provider');
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

export async function translateToSpanish(text: string, options?: { force?: boolean }): Promise<string> {
  const key = text.trim();
  if (!key) return '';

  const cached = getCachedTranslation(key);
  if (cached && !options?.force) return cached;

  if (!options?.force) {
    throw new Error('Traduce la lección con el botón Traducir o Guardar');
  }

  const bulk = await translateBulk([key]);
  const translated = bulk.translations[key];
  if (!translated) throw new Error('Gemini no devolvió traducción para este texto');
  return translated;
}

export async function translateBulk(
  items: string[],
  options: TranslateBulkOptions = {},
): Promise<BulkTranslationResult> {
  const keys = [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const key of keys) {
    const cached = getCachedTranslation(key);
    if (cached) {
      result[key] = cached;
    } else if (!isManualTranslation(key)) {
      missing.push(key);
    }
  }

  if (missing.length === 0) return { translations: result };

  const fromGemini = await translateWithGemini(missing, activeLang, {
    lessonSentences: options.lessonSentences,
  });

  for (const key of missing) {
    const translation = fromGemini.translations[key]?.trim();
    if (!translation) continue;
    cacheTranslation(key, translation);
    result[key] = translation;
  }

  return { translations: result };
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
