export function splitIntoSentences(text: string): string[] {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return [];

  const parts = normalized.split(/(?<=[.!?…;:])\s+/u);
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function titleFromText(text: string): string {
  const first = splitIntoSentences(text)[0] ?? text;
  const trimmed = first.trim();
  if (trimmed.length <= 48) return trimmed;
  return `${trimmed.slice(0, 45)}…`;
}
