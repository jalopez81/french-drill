import type { FlashcardCategory } from '../utils/spacedRepetition';

export const FLASHCARD_CATEGORIES: {
  id: FlashcardCategory;
  label: string;
  className: string;
}[] = [
  { id: 'new', label: 'Nuevas', className: 'flashcard-stat--purple' },
  { id: 'hard', label: 'Aprendiendo', className: 'flashcard-stat--hard' },
  { id: 'again', label: 'Pendientes', className: 'flashcard-stat--again' },
  { id: 'good', label: 'En repaso', className: 'flashcard-stat--good' },
  { id: 'easy', label: 'Dominadas', className: 'flashcard-stat--easy' },
];
