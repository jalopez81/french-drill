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
  getStudyVoice,
  getSystemVoices,
  hasGenderVoiceChoice,
  listStudyVoices,
  loadVoiceGender,
  pickRandomNativeVoice,
  pickVoiceForGender,
  preloadStudyVoices,
  resolveVoiceGender,
  saveVoiceGender,
  setPreferredStudyVoice,
  voicePrefKey,
  type VoiceGender,
} from '../utils/studyVoice';

export type SpeechMode = 'native' | 'online';

function voiceKey(voice: SpeechSynthesisVoice): string {
  return `${voice.name}::${voice.lang}`;
}

function findVoiceByKey(key: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return voices.find((voice) => voiceKey(voice) === key) ?? null;
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

  useEffect(() => {
    activateSpeechLang(studyLanguage);
    window.speechSynthesis?.cancel();
    stopLingvaSpeech();

    return preloadStudyVoices(studyLanguage, (voice) => {
      const savedKey = localStorage.getItem(voicePrefKey(studyLanguage));
      const savedVoice = savedKey ? findVoiceByKey(savedKey) : null;
      const gender = loadVoiceGender(studyLanguage);
      const genderVoice = pickVoiceForGender(studyLanguage, gender);
      const selected = savedVoice ?? genderVoice ?? voice ?? getStudyVoice(studyLanguage);

      if (selected) setPreferredStudyVoice(studyLanguage, selected);

      studyVoiceRef.current = selected;
      setStudyVoice(selected);
      setStudyVoices(listStudyVoices(studyLanguage));
      setSystemVoiceCount(getSystemVoices().length);
      setVoiceGender(resolveVoiceGender(selected, studyLanguage));

      const nativeAvailable = canUseNativeSpeech() && Boolean(selected);
      setSpeechMode(nativeAvailable ? 'native' : 'online');
    });
  }, [studyLanguage]);

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
      setPreferredStudyVoice(studyLanguage, voice);
      studyVoiceRef.current = voice;
      setStudyVoice(voice);
      setVoiceGender(resolveVoiceGender(voice, studyLanguage));
      localStorage.setItem(voicePrefKey(studyLanguage), voiceKey(voice));
      if (canUseNativeSpeech()) {
        setSpeechMode('native');
      }
    },
    [studyLanguage],
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

  const speakNative = useCallback((text: string, rate: number, speechTag: string) => {
    const synth = window.speechSynthesis;
    if (!text.trim() || !synth) {
      return Promise.reject(new Error('Voz nativa no disponible'));
    }

    synth.cancel();

    const voice =
      pickRandomNativeVoice(studyLanguage, voiceGenderRef.current) ??
      studyVoiceRef.current ??
      getStudyVoice(studyLanguage);

    return new Promise<void>((resolve, reject) => {
      const run = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voice?.lang ?? speechTag;

        if (voice) {
          utterance.voice = voice;
        }

        utterance.rate = rate;

        utterance.onstart = () => {
          speakingRef.current = true;
          setSpeaking(true);
        };

        utterance.onend = () => {
          speakingRef.current = false;
          setSpeaking(false);
          resolve();
        };

        utterance.onerror = (event) => {
          speakingRef.current = false;
          setSpeaking(false);
          if (event.error === 'interrupted' || event.error === 'canceled') {
            resolve();
            return;
          }
          reject(new Error('Error de voz nativa'));
        };

        synth.speak(utterance);

        if (synth.paused) {
          synth.resume();
        }
      };

      window.setTimeout(run, 50);
    });
  }, [studyLanguage]);

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
    async (text: string) => {
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
          await speakNative(text, nativeRate, speechTag);
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
            await speakNative(text, nativeRate, speechTag);
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
    voiceGender,
    selectVoiceGender,
    canChooseVoiceGender: hasGenderVoiceChoice(studyLanguage),
    systemVoiceCount,
    speechMode,
    speechSpeed,
    setSpeechSpeed,
    canUseNativeSpeech: canUseNativeSpeech(),
    prefetchSpeech,
  };
}
