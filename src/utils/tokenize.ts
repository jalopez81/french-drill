export interface SentenceToken {
  kind: 'word' | 'other';
  text: string;
}

export function tokenizeSentence(sentence: string): SentenceToken[] {
  const tokens: SentenceToken[] = [];
  const regex = /[\p{L}][\p{L}'-]*|[^\p{L}]+/gu;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sentence)) !== null) {
    const text = match[0];
    tokens.push({
      kind: /^[\p{L}]/u.test(text) ? 'word' : 'other',
      text,
    });
  }

  return tokens;
}
