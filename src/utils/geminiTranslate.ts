import type { StudyLanguage } from '../config/languages';
import { LANGUAGES, TARGET_LANG } from '../config/languages';

const GEMINI_API_KEY_STORAGE = 'french-drill-gemini-api-key';
const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const CHUNK_SIZE = 80;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export interface GeminiTranslationResult {
  translations: Record<string, string>;
}

export interface TranslateWithGeminiOptions {
  lessonSentences?: string[];
}

export function getGeminiApiKey(): string | null {
  const fromEnv = import.meta.env.VITE_GEMINI_API_KEY;
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();
  try {
    const stored = localStorage.getItem(GEMINI_API_KEY_STORAGE);
    return stored?.trim() || null;
  } catch {
    return null;
  }
}

export function setGeminiApiKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(GEMINI_API_KEY_STORAGE, trimmed);
  } else {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  }
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

function buildPrompt(items: string[], sourceLang: StudyLanguage): string {
  const sourceLabel = LANGUAGES[sourceLang].label;
  const targetLabel = TARGET_LANG === 'es' ? 'Spanish' : TARGET_LANG;

  return [
    `Translate ${sourceLabel} to ${targetLabel} for a language-learning app.`,
    'Return JSON only: {"translations":{"<source exactly as given>":"<translation>"}}',
    'Rules:',
    '- Every input item must appear as a key in "translations" (exact string match).',
    '- Preserve punctuation and casing in keys.',
    '- Output valid JSON only, no markdown.',
    '',
    'Input items:',
    JSON.stringify(items),
  ].join('\n');
}

async function callGemini(prompt: string, apiKey: string): Promise<GeminiTranslationResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini ${response.status}: ${detail.slice(0, 240)}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini devolvió una respuesta vacía');

  const parsed = JSON.parse(text) as { translations?: Record<string, string> };
  if (!parsed.translations || typeof parsed.translations !== 'object') {
    throw new Error('Gemini devolvió JSON sin campo "translations"');
  }

  const translations: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.translations)) {
    const trimmed = String(value).trim();
    if (key && trimmed) translations[key] = trimmed;
  }

  return { translations };
}

export async function translateWithGemini(
  items: string[],
  sourceLang: StudyLanguage,
  _options: TranslateWithGeminiOptions = {},
): Promise<GeminiTranslationResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Configura VITE_GEMINI_API_KEY en el entorno de despliegue');
  }

  const unique = [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  if (unique.length === 0) return { translations: {} };

  const mergedTranslations: Record<string, string> = {};

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    const chunkResult = await callGemini(buildPrompt(chunk, sourceLang), apiKey);
    Object.assign(mergedTranslations, chunkResult.translations);
  }

  return { translations: mergedTranslations };
}
