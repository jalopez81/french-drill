export type StudyLanguage = 'fr' | 'en';

export interface LanguageConfig {
  code: StudyLanguage;
  label: string;
  appTitle: string;
  subtitle: string;
  textPlaceholder: string;
  flashcardLangLabel: string;
  voiceTestPhrase: string;
  speechTag: string;
  lingvaCode: string;
  preferredVoiceLang: string;
}

export const LANGUAGES: Record<StudyLanguage, LanguageConfig> = {
  fr: {
    code: 'fr',
    label: 'Francés',
    appTitle: 'Word Gym',
    subtitle: 'Práctica personalizada de idiomas',
    textPlaceholder: 'Pega aquí tu lección en francés. Deja el título vacío para usar la primera oración como título. Cada oración termina con un punto, un signo de interrogación o un signo de exclamación.',
    flashcardLangLabel: 'Francés',
    voiceTestPhrase: 'Bonjour, je parle français.',
    speechTag: 'fr-FR',
    lingvaCode: 'fr',
    preferredVoiceLang: 'fr-fr',
  },
  en: {
    code: 'en',
    label: 'Inglés',
    appTitle: 'Word Gym',
    subtitle: 'Práctica personalizada de idiomas',
    textPlaceholder: 'Pega aquí tu lección en inglés. Deja el título vacío para usar la primera oración como título. Cada oración termina con un punto, un signo de interrogación o un signo de exclamación. No uses mayúsculas al inicio de las oraciones.',
    flashcardLangLabel: 'Inglés',
    voiceTestPhrase: 'Hello, I speak English.',
    speechTag: 'en-US',
    lingvaCode: 'en',
    preferredVoiceLang: 'en-us',
  },
};

export const TARGET_LANG = 'es';

export const ACTIVE_LANGUAGE_KEY = 'french-drill-active-language';

export function getActiveLanguage(): StudyLanguage {
  const saved = localStorage.getItem(ACTIVE_LANGUAGE_KEY);
  return saved === 'en' ? 'en' : 'fr';
}

export function setActiveLanguage(lang: StudyLanguage): void {
  localStorage.setItem(ACTIVE_LANGUAGE_KEY, lang);
}
