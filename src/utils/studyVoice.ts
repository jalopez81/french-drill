import type { StudyLanguage } from '../config/languages';
import { LANGUAGES } from '../config/languages';

export type VoiceGender = 'female' | 'male';

const voiceCache = new Map<StudyLanguage, SpeechSynthesisVoice | null | undefined>();

function genderPrefKey(lang: StudyLanguage): string {
  return `french-drill-voice-gender-${lang}`;
}

export function loadVoiceGender(lang: StudyLanguage): VoiceGender {
  const saved = localStorage.getItem(genderPrefKey(lang));
  return saved === 'male' ? 'male' : 'female';
}

export function saveVoiceGender(lang: StudyLanguage, gender: VoiceGender): void {
  localStorage.setItem(genderPrefKey(lang), gender);
}

function normalizeLang(lang: string | undefined): string {
  return (lang ?? '').trim().toLowerCase().replace(/_/g, '-');
}

function frenchNameHints(name: string): boolean {
  return (
    /\b(français|francais|french|france)\b/.test(name) ||
    /\(france\)|\(français\)|\(french\)/.test(name) ||
    /hortense|denise|julie|eloise|élodie|elodie|celeste|céleste|clarisse|jacqueline|caroline|fabrice|charline|yves|virginie|audrey|marie|amelie|amélie|léa|lea|aurelie|aurélie|damien|nicolas|jacques|thomas|daniel/.test(
      name,
    )
  );
}

function englishNameHints(name: string): boolean {
  return (
    /\b(english|inglés|ingles|anglais)\b/.test(name) ||
    /\(us\)|\(uk\)|\(united states\)|\(united kingdom\)|\(english\)/.test(name) ||
    /samantha|karen|victoria|moira|tessa|kate|zira|susan|fiona|alex|daniel|tom|fred|ralph|david|mark|james|aaron|helen|george|hazel/.test(
      name,
    )
  );
}

function isOtherStudyLanguage(voice: SpeechSynthesisVoice, lang: StudyLanguage): boolean {
  const voiceLang = normalizeLang(voice.lang);
  const name = voice.name.toLowerCase();

  if (lang === 'fr') {
    if (voiceLang.startsWith('en')) return true;
    if (englishNameHints(name) && !voiceLang.startsWith('fr')) return true;
    return false;
  }

  if (voiceLang.startsWith('fr')) return true;
  if (frenchNameHints(name) && !voiceLang.startsWith('en')) return true;
  return false;
}

export function isStudyVoice(voice: SpeechSynthesisVoice, lang: StudyLanguage): boolean {
  if (isOtherStudyLanguage(voice, lang)) return false;

  const code = LANGUAGES[lang].lingvaCode;
  const voiceLang = normalizeLang(voice.lang);

  if (voiceLang === code || voiceLang.startsWith(`${code}-`)) return true;

  const name = voice.name.toLowerCase();
  if (lang === 'fr') return frenchNameHints(name) && !englishNameHints(name);
  return englishNameHints(name) && !frenchNameHints(name);
}

function scoreStudyVoice(voice: SpeechSynthesisVoice, lang: StudyLanguage): number {
  let score = 0;
  const voiceLang = normalizeLang(voice.lang);
  const preferred = LANGUAGES[lang].preferredVoiceLang;

  if (voiceLang === preferred) score += 10;
  else if (voiceLang.startsWith(LANGUAGES[lang].lingvaCode)) score += 5;
  else if (isStudyVoice(voice, lang)) score += 3;

  if (voice.localService) score += 4;

  const name = voice.name.toLowerCase();
  if (lang === 'fr') {
    if (
      name.includes('thomas') ||
      name.includes('hortense') ||
      name.includes('denise') ||
      name.includes('amelie') ||
      name.includes('amélie') ||
      name.includes('audrey') ||
      name.includes('marie') ||
      name.includes('julie') ||
      name.includes('eloise') ||
      name.includes('paul')
    ) {
      score += 3;
    }
    if (name.includes('français') || name.includes('french') || name.includes('france')) score += 2;
  } else {
    if (
      name.includes('samantha') ||
      name.includes('alex') ||
      name.includes('daniel') ||
      name.includes('karen') ||
      name.includes('zira')
    ) {
      score += 3;
    }
    if (name.includes('english')) score += 2;
  }

  return score;
}

export function inferVoiceGender(
  voice: SpeechSynthesisVoice,
  lang: StudyLanguage,
): VoiceGender | null {
  const name = voice.name.toLowerCase();

  if (/\b(female|woman|mujer|femme|féminin|feminine)\b/.test(name)) return 'female';
  if (/\b(male|man|hombre|homme|masculin|masculine)\b/.test(name)) return 'male';

  if (lang === 'fr') {
    if (
      /amelie|amélie|audrey|marie|virginie|claire|julie|elodie|élodie|helene|hélène|hortense|denise|eloise|celeste|céleste|clarisse|jacqueline|caroline|charline/.test(
        name,
      )
    ) {
      return 'female';
    }
    if (
      /thomas|nicolas|jacques|henri|damien|bernard|paul|claude|jerome|jérôme|guillaume|fabrice|yves|denis/.test(
        name,
      )
    ) {
      return 'male';
    }
  } else {
    if (/samantha|karen|victoria|moira|tessa|kate|zira|susan|fiona|helen|hazel/.test(name)) {
      return 'female';
    }
    if (/alex|daniel|tom|fred|ralph|david|mark|james|aaron|george/.test(name)) return 'male';
  }

  return null;
}

export function listVoicesForGender(
  lang: StudyLanguage,
  gender: VoiceGender,
): SpeechSynthesisVoice[] {
  return listStudyVoices(lang).filter((voice) => inferVoiceGender(voice, lang) === gender);
}

export function pickVoiceForGender(
  lang: StudyLanguage,
  gender: VoiceGender,
): SpeechSynthesisVoice | null {
  const matches = listVoicesForGender(lang, gender);
  if (matches.length > 0) return matches[0];

  const unknown = listStudyVoices(lang).filter((voice) => inferVoiceGender(voice, lang) === null);
  return unknown[0] ?? listStudyVoices(lang)[0] ?? null;
}

export function pickRandomNativeVoice(
  lang: StudyLanguage,
  gender: VoiceGender,
): SpeechSynthesisVoice | null {
  const byGender = listVoicesForGender(lang, gender);
  const pool = byGender.length > 0 ? byGender : listStudyVoices(lang);
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function resolveVoiceGender(
  voice: SpeechSynthesisVoice | null,
  lang: StudyLanguage,
): VoiceGender {
  if (!voice) return loadVoiceGender(lang);
  return inferVoiceGender(voice, lang) ?? loadVoiceGender(lang);
}

export function hasGenderVoiceChoice(lang: StudyLanguage): boolean {
  const voices = listStudyVoices(lang);
  if (voices.length === 0) return false;

  const hasFemale = voices.some((voice) => inferVoiceGender(voice, lang) === 'female');
  const hasMale = voices.some((voice) => inferVoiceGender(voice, lang) === 'male');
  return hasFemale && hasMale;
}

export function voiceKey(voice: SpeechSynthesisVoice): string {
  return `${voice.name}::${voice.lang}`;
}

export function findVoiceByKey(key: string): SpeechSynthesisVoice | null {
  const voices = getSystemVoices();
  return voices.find((voice) => voiceKey(voice) === key) ?? null;
}

export function formatVoiceLabel(voice: SpeechSynthesisVoice): string {
  return `${voice.name} (${voice.lang})`;
}

export function getSystemVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? [];
}

export function clearVoicePreference(lang: StudyLanguage): void {
  localStorage.removeItem(voicePrefKey(lang));
  voiceCache.delete(lang);
}

export function reloadStudyVoices(lang: StudyLanguage): SpeechSynthesisVoice[] {
  voiceCache.delete(lang);
  const synth = window.speechSynthesis;
  if (synth) {
    wakeVoiceList(synth);
  }
  return listStudyVoices(lang);
}

function wakeVoiceList(synth: SpeechSynthesis): void {
  synth.getVoices();
  const utterance = new SpeechSynthesisUtterance('');
  utterance.volume = 0;
  synth.speak(utterance);
  synth.cancel();
}

function pickStudyVoice(
  voices: SpeechSynthesisVoice[],
  lang: StudyLanguage,
): SpeechSynthesisVoice | null {
  const matches = voices.filter((voice) => isStudyVoice(voice, lang));
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => scoreStudyVoice(b, lang) - scoreStudyVoice(a, lang))[0];
}

export function getStudyVoice(lang: StudyLanguage): SpeechSynthesisVoice | null {
  if (voiceCache.has(lang)) return voiceCache.get(lang) ?? null;

  const voices = getSystemVoices();
  const picked = pickStudyVoice(voices, lang);
  voiceCache.set(lang, picked);
  return picked;
}

export function listStudyVoices(lang: StudyLanguage): SpeechSynthesisVoice[] {
  return getSystemVoices()
    .filter((voice) => isStudyVoice(voice, lang))
    .sort((a, b) => scoreStudyVoice(b, lang) - scoreStudyVoice(a, lang));
}

export function preloadStudyVoices(
  lang: StudyLanguage,
  onUpdate: (voice: SpeechSynthesisVoice | null) => void,
): () => void {
  const synth = window.speechSynthesis;
  if (!synth) {
    onUpdate(null);
    return () => undefined;
  }

  const refresh = () => {
    voiceCache.delete(lang);
    const voices = synth.getVoices();
    const picked = voices.length > 0 ? pickStudyVoice(voices, lang) : null;
    voiceCache.set(lang, picked);
    onUpdate(picked);
  };

  wakeVoiceList(synth);
  refresh();
  synth.addEventListener('voiceschanged', refresh);

  const retries = window.setTimeout(() => refresh(), 250);
  const retries2 = window.setTimeout(() => refresh(), 1000);

  return () => {
    window.clearTimeout(retries);
    window.clearTimeout(retries2);
    synth.removeEventListener('voiceschanged', refresh);
  };
}

export function setPreferredStudyVoice(lang: StudyLanguage, voice: SpeechSynthesisVoice | null): void {
  voiceCache.set(lang, voice ?? null);
}

export function voicePrefKey(lang: StudyLanguage): string {
  return `french-drill-voice-uri-${lang}`;
}
