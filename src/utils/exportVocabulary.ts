import type { VocabEntry } from '../types';
import { getFlashcardCategory } from './spacedRepetition';

export function exportVocabularyJson(vocabulary: VocabEntry[]): string {
  const rows = vocabulary.map((entry) => ({
    word: entry.word,
    translation: entry.translation ?? '',
    category: entry.translation ? getFlashcardCategory(entry) : 'new',
    addedAt: entry.addedAt,
  }));
  return JSON.stringify(rows, null, 2);
}

export function exportVocabularyCsv(vocabulary: VocabEntry[]): string {
  const header = 'word,translation,category,addedAt';
  const rows = vocabulary.map((entry) => {
    const word = `"${entry.word.replace(/"/g, '""')}"`;
    const translation = `"${(entry.translation ?? '').replace(/"/g, '""')}"`;
    const category = entry.translation ? getFlashcardCategory(entry) : 'new';
    return `${word},${translation},${category},${entry.addedAt}`;
  });
  return [header, ...rows].join('\n');
}

export function downloadTextFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
