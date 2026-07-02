import type { StudyLanguage } from '../config/languages';
import { LANGUAGES, TARGET_LANG } from '../config/languages';
import type { AppState, VocabEntry } from '../types';
import { getGeminiApiKey } from './geminiTranslate';
import { cacheTranslation } from './translate';
import { normalizePhrase } from './wordExtractor';

const GEMINI_MODEL = 'gemini-3.1-flash-lite';

export interface MemoryCapsule {
  phrase: string;
  translation: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

function buildCapsulesPrompt(sentences: string[], sourceLang: StudyLanguage): string {
  const sourceLabel = LANGUAGES[sourceLang].label;
  const targetLabel = TARGET_LANG === 'es' ? 'Spanish' : TARGET_LANG;

  return [
    `You are building spaced-repetition "memory capsules" for a ${sourceLabel} learner.`,
    'Return JSON only:',
    `{"capsules":[{"phrase":"<${sourceLabel} fragment>","translation":"<${targetLabel}>"}]}`,
    'Rules:',
    '- Generate 5–10 capsules per lesson sentence (fewer if the lesson is very short).',
    '- Include: exact sub-phrases from the lesson, useful collocations, and related variants',
    '  (e.g. swap possessives ton/mon/son, singular/plural, add/remove adverbs, one contrasting negative).',
    '- Example for "J\'accepte ton invitation avec plaisir, Marie":',
    '  "j\'accepte", "ton invitation", "mon invitation", "j\'accepte avec plaisir",',
    '  "je n\'aime pas l\'invitation", "mes invitations".',
    `- Each phrase: 2–8 words, natural ${sourceLabel}, max 70 characters.`,
    `- Each translation: natural ${targetLabel}.`,
    '- No duplicate phrases. Valid JSON only, no markdown.',
    '',
    'Lesson sentences:',
    JSON.stringify(sentences),
  ].join('\n');
}

export async function fetchMemoryCapsules(
  sentences: string[],
  sourceLang: StudyLanguage,
): Promise<MemoryCapsule[]> {
  const trimmed = sentences.map((s) => s.trim()).filter(Boolean);
  if (trimmed.length === 0) return [];

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Configura VITE_GEMINI_API_KEY en el entorno de despliegue');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildCapsulesPrompt(trimmed, sourceLang) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.35,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini cápsulas ${response.status}: ${detail.slice(0, 240)}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) return [];

  const parsed = JSON.parse(text) as { capsules?: Array<{ phrase?: string; translation?: string }> };
  if (!Array.isArray(parsed.capsules)) return [];

  const seen = new Set<string>();
  const result: MemoryCapsule[] = [];

  for (const item of parsed.capsules) {
    const phrase = String(item.phrase ?? '').trim();
    const translation = String(item.translation ?? '').trim();
    if (!phrase || !translation) continue;
    const key = normalizePhrase(phrase);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({ phrase, translation });
  }

  return result;
}

export function lessonHasCapsules(vocabulary: VocabEntry[], textId: string): boolean {
  return vocabulary.some((entry) => entry.kind === 'capsule' && entry.sourceTextId === textId);
}

export function createCapsuleEntries(
  capsules: MemoryCapsule[],
  sourceTextId: string,
  existingVocabulary: VocabEntry[],
): VocabEntry[] {
  const existingNormalized = new Set(existingVocabulary.map((entry) => entry.normalized));
  const existingCapsuleKeys = new Set(
    existingVocabulary
      .filter((entry) => entry.kind === 'capsule' && entry.sourceTextId === sourceTextId)
      .map((entry) => entry.normalized),
  );

  const entries: VocabEntry[] = [];

  for (const capsule of capsules) {
    const phrase = capsule.phrase.trim();
    const translation = capsule.translation.trim();
    const normalized = normalizePhrase(phrase);
    if (!normalized || existingCapsuleKeys.has(normalized)) continue;
    if (existingNormalized.has(normalized)) continue;

    cacheTranslation(phrase, translation);
    existingNormalized.add(normalized);
    existingCapsuleKeys.add(normalized);

    entries.push({
      id: crypto.randomUUID(),
      word: phrase,
      normalized,
      translation,
      kind: 'capsule',
      sourceTextId,
      addedAt: Date.now(),
    });
  }

  return entries;
}

export async function ensureMissingLessonCapsules(
  state: AppState,
  sourceLang: StudyLanguage,
): Promise<{ state: AppState; lessonsUpdated: number; capsulesAdded: number }> {
  let next = state;
  let lessonsUpdated = 0;
  let capsulesAdded = 0;

  for (const text of state.savedTexts) {
    if (lessonHasCapsules(next.vocabulary, text.id)) continue;

    try {
      const capsules = await fetchMemoryCapsules(text.sentences, sourceLang);
      if (capsules.length === 0) continue;

      const newEntries = createCapsuleEntries(capsules, text.id, next.vocabulary);
      if (newEntries.length === 0) continue;

      next = {
        ...next,
        savedTexts: next.savedTexts.map((item) =>
          item.id === text.id ? { ...item, capsulesAt: Date.now() } : item,
        ),
        vocabulary: [...newEntries, ...next.vocabulary],
      };
      lessonsUpdated += 1;
      capsulesAdded += newEntries.length;
    } catch {
      // omitir lección si falla Gemini
    }
  }

  return { state: next, lessonsUpdated, capsulesAdded };
}
