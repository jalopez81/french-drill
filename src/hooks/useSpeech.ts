import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyLanguage } from '../config/languages';
import { LANGUAGES } from '../config/languages';
import {
  activateSpeechLang,
  canUseNativeSpeech,
  prefetchStudyAudio,
  speakWithLingva,
  stopLingvaSpeech,
} from '../utils/lingvaSpeech';
import type { SpeechSpeed } from '../utils/speechSpeed';
import {
  loadSpeechSpeed,
  saveSpeechSpeed,
  SPEECH_PLAYBACK_RATES,
  SPEECH_SPEED_RATES,
} from '../utils/speechSpeed';
import {
  clearVoicePreference,
  findVoiceByKey,
  getStudyVoice,
  getSystemVoices,
  hasGenderVoiceChoice,
  isStudyVoice,
  listStudyVoices,
  loadVoiceGender,
  pickVoiceForGender,
  preloadStudyVoices,
  reloadStudyVoices,
  resolveVoiceGender,
  saveVoiceGender,
  setPreferredStudyVoice,
  voiceKey,
  voicePrefKey,
  type VoiceGender,
} from '../utils/studyVoice';
import {
  clearWordVoiceKey,
  getWordVoiceKey,
  setWordVoiceKey,
} from '../utils/wordVoice';

export type SpeechMode = 'native' | 'online';

export interface SpeakOptions {
  word?: string;
}

function resolveVoiceForSpeech(
  lang: StudyLanguage,
  preferred: SpeechSynthesisVoice | null,
  word?: string,
): SpeechSynthesisVoice | null {
  if (word) {
    const overrideKey = getWordVoiceKey(lang, word);
    if (overrideKey) {
      const overrideVoice = findVoiceByKey(overrideKey);
      if (overrideVoice && isStudyVoice(overrideVoice, lang)) {
        return overrideVoice;
      }
    }
  }

  return preferred ?? pickVoiceForGender(lang, loadVoiceGender(lang)) ?? getStudyVoice(lang);
}

export function useSpeech(studyLanguage: StudyLanguage) {
  const [speaking, setSpeaking] = useState(false);
  const [studyVoice, setStudyVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [studyVoices, setStudyVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechMode, setSpeechMode] = useState<SpeechMode>(() =>
    canUseNativeSpeech() ? 'native' : 'online',
  );
  const [speechSpeed, setSpeechSpeedState] = useState<SpeechSpeed>(() => loadSpeechSpeed());
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(() => loadVoiceGender(studyLanguage));
  const [systemVoiceCount, setSystemVoiceCount] = useState(0);
  const studyVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voiceGenderRef = useRef<VoiceGender>(voiceGender);
  const speechSpeedRef = useRef<SpeechSpeed>(speechSpeed);
  const speakingRef = useRef(false);

  useEffect(() => {
    studyVoiceRef.current = studyVoice;
  }, [studyVoice]);

  useEffect(() => {
    speechSpeedRef.current = speechSpeed;
  }, [speechSpeed]);

  useEffect(() => {
    voiceGenderRef.current = voiceGender;
  }, [voiceGender]);

  const refreshVoiceLists = useCallback(() => {
    setStudyVoices(listStudyVoices(studyLanguage));
    setSystemVoiceCount(getSystemVoices().length);
  }, [studyLanguage]);

  const applyVoiceSelection = useCallback(
    (selected: SpeechSynthesisVoice | null) => {
      if (selected) {
        setPreferredStudyVoice(studyLanguage, selected);
        studyVoiceRef.current = selected;
        setStudyVoice(selected);
        setVoiceGender(resolveVoiceGender(selected, studyLanguage));
        localStorage.setItem(voicePrefKey(studyLanguage), voiceKey(selected));
        if (canUseNativeSpeech()) {
          setSpeechMode('native');
        }
      } else {
        clearVoicePreference(studyLanguage);
        studyVoiceRef.current = null;
        setStudyVoice(null);
      }

      refreshVoiceLists();
    },
    [refreshVoiceLists, studyLanguage],
  );

  useEffect(() => {
    activateSpeechLang(studyLanguage);
    window.speechSynthesis?.cancel();
    stopLingvaSpeech();

    return preloadStudyVoices(studyLanguage, (voice) => {
      const savedKey = localStorage.getItem(voicePrefKey(studyLanguage));
      const savedVoice = savedKey ? findVoiceByKey(savedKey) : null;
      const gender = loadVoiceGender(studyLanguage);
      const genderVoice = pickVoiceForGender(studyLanguage, gender);
      const selected =
        (savedVoice && isStudyVoice(savedVoice, studyLanguage) ? savedVoice : null) ??
        genderVoice ??
        voice ??
        getStudyVoice(studyLanguage);

      applyVoiceSelection(selected);
    });
  }, [applyVoiceSelection, studyLanguage]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      stopLingvaSpeech();
    };
  }, []);

  const setSpeechSpeed = useCallback((speed: SpeechSpeed) => {
    speechSpeedRef.current = speed;
    setSpeechSpeedState(speed);
    saveSpeechSpeed(speed);
  }, []);

  const selectVoice = useCallback(
    (voice: SpeechSynthesisVoice) => {
      if (!isStudyVoice(voice, studyLanguage)) return;
      applyVoiceSelection(voice);
    },
    [applyVoiceSelection, studyLanguage],
  );

  const selectVoiceGender = useCallback(
    (gender: VoiceGender) => {
      saveVoiceGender(studyLanguage, gender);
      setVoiceGender(gender);

      const voice = pickVoiceForGender(studyLanguage, gender);
      if (voice) {
        selectVoice(voice);
        return;
      }

      if (canUseNativeSpeech()) {
        setSpeechMode('online');
      }
    },
    [selectVoice, studyLanguage],
  );

  const clearVoice = useCallback(() => {
    window.speechSynthesis?.cancel();
    stopLingvaSpeech();
    applyVoiceSelection(null);
  }, [applyVoiceSelection]);

  const reloadVoices = useCallback(() => {
    window.speechSynthesis?.cancel();
    stopLingvaSpeech();
    clearVoicePreference(studyLanguage);
    reloadStudyVoices(studyLanguage);

    const gender = voiceGenderRef.current;
    const selected = pickVoiceForGender(studyLanguage, gender) ?? getStudyVoice(studyLanguage);
    applyVoiceSelection(selected);
  }, [applyVoiceSelection, studyLanguage]);

  const selectWordVoice = useCallback(
    (word: string, voice: SpeechSynthesisVoice | null) => {
      if (voice) {
        if (!isStudyVoice(voice, studyLanguage)) return;
        setWordVoiceKey(studyLanguage, word, voiceKey(voice));
        return;
      }
      clearWordVoiceKey(studyLanguage, word);
    },
    [studyLanguage],
  );

  const getWordVoiceOverrideKey = useCallback(
    (word: string) => getWordVoiceKey(studyLanguage, word),
    [studyLanguage],
  );

  const speakNative = useCallback(
    (text: string, rate: number, speechTag: string, word?: string) => {
      const synth = window.speechSynthesis;
      if (!text.trim() || !synth) {
        return Promise.reject(new Error('Voz nativa no disponible'));
      }

      synth.cancel();

      const voice = resolveVoiceForSpeech(studyLanguage, studyVoiceRef.current, word);

      return new Promise<void>((resolve, reject) => {
        const run = () => {
          synth.getVoices();

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = voice?.lang ?? speechTag;

          if (voice) {
            utterance.voice = voice;
          }

          utterance.rate = rate;

          const resumeInterval = window.setInterval(() => {
            if (synth.speaking && synth.paused) {
              synth.resume();
            }
          }, 200);

          const finish = (callback: () => void) => {
            window.clearInterval(resumeInterval);
            speakingRef.current = false;
            setSpeaking(false);
            callback();
          };

          utterance.onstart = () => {
            speakingRef.current = true;
            setSpeaking(true);
            if (synth.paused) {
              synth.resume();
            }
          };

          utterance.onend = () => {
            finish(resolve);
          };

          utterance.onerror = (event) => {
            finish(() => {
              if (event.error === 'interrupted' || event.error === 'canceled') {
                resolve();
                return;
              }
              reject(new Error('Error de voz nativa'));
            });
          };

          synth.speak(utterance);

          if (synth.paused) {
            synth.resume();
          }
        };

        window.setTimeout(run, 100);
      });
    },
    [studyLanguage],
  );

  const speakOnline = useCallback(async (text: string, playbackRate: number) => {
    speakingRef.current = true;
    setSpeaking(true);

    try {
      await speakWithLingva(text, playbackRate);
    } finally {
      speakingRef.current = false;
      setSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    async (text: string, options?: SpeakOptions) => {
      if (!text.trim()) return;

      const speed = speechSpeedRef.current;
      const nativeRate = SPEECH_SPEED_RATES[speed];
      const playbackRate = SPEECH_PLAYBACK_RATES[speed];
      const speechTag = LANGUAGES[studyLanguage].speechTag;

      window.speechSynthesis?.cancel();
      stopLingvaSpeech();

      const nativeVoicesAvailable = listStudyVoices(studyLanguage).length > 0;
      const preferNative =
        speechMode === 'native' && canUseNativeSpeech() && nativeVoicesAvailable;

      if (preferNative) {
        try {
          await speakNative(text, nativeRate, speechTag, options?.word);
          return;
        } catch {
          setSpeechMode('online');
        }
      }

      try {
        await speakOnline(text, playbackRate);
      } catch {
        if (canUseNativeSpeech()) {
          try {
            await speakNative(text, nativeRate, speechTag, options?.word);
            setSpeechMode('native');
          } catch {
            // no-op
          }
        }
      }
    },
    [speechMode, speakNative, speakOnline, studyLanguage],
  );

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    stopLingvaSpeech();
    speakingRef.current = false;
    setSpeaking(false);
  }, []);

  const prefetchSpeech = useCallback(async (texts: string[]) => {
    return prefetchStudyAudio(texts);
  }, []);

  return {
    speak,
    stop,
    speaking,
    studyVoice,
    studyVoices,
    selectVoice,
    clearVoice,
    reloadVoices,
    voiceGender,
    selectVoiceGender,
    selectWordVoice,
    getWordVoiceOverrideKey,
    canChooseVoiceGender: hasGenderVoiceChoice(studyLanguage),
    systemVoiceCount,
    speechMode,
    speechSpeed,
    setSpeechSpeed,
    canUseNativeSpeech: canUseNativeSpeech(),
    prefetchSpeech,
  };
}
