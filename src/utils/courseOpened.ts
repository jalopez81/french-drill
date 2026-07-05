import type { StudyLanguage } from '../config/languages';

function storageKey(lang: StudyLanguage): string {
  return `word-gym-course-opened-${lang}`;
}

export function getOpenedCourseUnits(lang: StudyLanguage): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(lang));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function markCourseUnitOpened(lang: StudyLanguage, unitId: string): void {
  const opened = getOpenedCourseUnits(lang);
  if (opened.has(unitId)) return;
  opened.add(unitId);
  localStorage.setItem(storageKey(lang), JSON.stringify([...opened]));
}
