import type { StudyLanguage } from '../config/languages';
import type { VocabEntry } from '../types';
import { getFlashcardCategory, summarizeFlashcardDeck } from './spacedRepetition';

const STREAK_KEY_PREFIX = 'french-drill-streak-';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function loadStreak(lang: StudyLanguage): StreakData {
  try {
    const raw = localStorage.getItem(`${STREAK_KEY_PREFIX}${lang}`);
    if (!raw) return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  }
}

function saveStreak(lang: StudyLanguage, data: StreakData): void {
  localStorage.setItem(`${STREAK_KEY_PREFIX}${lang}`, JSON.stringify(data));
}

export function recordStudyActivity(lang: StudyLanguage): StreakData {
  const today = todayKey();
  const data = loadStreak(lang);

  if (data.lastStudyDate === today) return data;

  const continued = data.lastStudyDate === yesterdayKey();
  const currentStreak = continued ? data.currentStreak + 1 : 1;
  const longestStreak = Math.max(data.longestStreak, currentStreak);
  const next = { currentStreak, longestStreak, lastStudyDate: today };
  saveStreak(lang, next);
  return next;
}

export function clearAllStreaks(): void {
  for (const lang of ['fr', 'en'] as StudyLanguage[]) {
    localStorage.removeItem(`${STREAK_KEY_PREFIX}${lang}`);
  }
}

export function getStudyStreak(lang: StudyLanguage): StreakData {
  const data = loadStreak(lang);
  if (data.lastStudyDate !== todayKey() && data.lastStudyDate !== yesterdayKey()) {
    return { ...data, currentStreak: 0 };
  }
  return data;
}

export function getWeeklyMasteredCount(vocabulary: VocabEntry[], now = Date.now()): number {
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return vocabulary.filter(
    (entry) =>
      entry.translation &&
      entry.srs?.lastReview &&
      entry.srs.lastReview >= weekAgo &&
      getFlashcardCategory(entry, now) === 'easy',
  ).length;
}

export function getProgressSummary(vocabulary: VocabEntry[], lang: StudyLanguage) {
  const streak = getStudyStreak(lang);
  const summary = summarizeFlashcardDeck(vocabulary);
  const mastered = summary.easy;
  const learning = summary.hard + summary.good;
  const pending = summary.again + summary.new;

  return {
    streak,
    summary,
    mastered,
    learning,
    pending,
    weeklyMastered: getWeeklyMasteredCount(vocabulary),
  };
}
