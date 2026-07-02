const WORD_PATTERN = /[\p{L}][\p{L}'-]*/gu;

export function extractWords(text: string): string[] {
  const matches = text.match(WORD_PATTERN) ?? [];
  return matches.filter((word) => word.length > 0);
}

export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function normalizePhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function uniqueWords(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const word of extractWords(text)) {
    const key = normalizeWord(word);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(word);
    }
  }

  return result;
}

export function countPhraseWords(text: string): number {
  return extractWords(text).length;
}
