import type { StudyLanguage } from '../config/languages';
import { normalizeWord } from './wordExtractor';

function storageKey(lang: StudyLanguage): string {
  return `french-drill-word-voices-${lang}`;
}

function readMap(lang: StudyLanguage): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(storageKey(lang)) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function writeMap(lang: StudyLanguage, map: Record<string, string>): void {
  localStorage.setItem(storageKey(lang), JSON.stringify(map));
}

export function getWordVoiceKey(lang: StudyLanguage, word: string): string | null {
  const key = normalizeWord(word);
  return readMap(lang)[key] ?? null;
}

export function setWordVoiceKey(lang: StudyLanguage, word: string, voiceKey: string): void {
  const map = readMap(lang);
  map[normalizeWord(word)] = voiceKey;
  writeMap(lang, map);
}

export function clearWordVoiceKey(lang: StudyLanguage, word: string): void {
  const map = readMap(lang);
  delete map[normalizeWord(word)];
  writeMap(lang, map);
}

export function clearAllWordVoices(): void {
  for (const lang of ['fr', 'en'] as StudyLanguage[]) {
    localStorage.removeItem(storageKey(lang));
  }
}
