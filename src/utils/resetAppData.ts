import type { StudyLanguage } from '../config/languages';
import { LANGUAGES } from '../config/languages';
import { deleteAudioDatabase } from './audioCache';
import { clearAllStreaks } from './progressStats';
import { clearAllLanguageStates } from './storage';
import { clearAllTranslationData } from './translate';
import { clearVoicePreference } from './studyVoice';
import { clearAllWordVoices } from './wordVoice';

const ALL_LANGS = Object.keys(LANGUAGES) as StudyLanguage[];

function genderPrefKey(lang: StudyLanguage): string {
  return `french-drill-voice-gender-${lang}`;
}

export async function resetAllAppData(): Promise<void> {
  clearAllLanguageStates();
  clearAllTranslationData();
  clearAllWordVoices();
  clearAllStreaks();

  for (const lang of ALL_LANGS) {
    clearVoicePreference(lang);
    localStorage.removeItem(genderPrefKey(lang));
    await deleteAudioDatabase(lang);
  }
}
