import type { StudyLanguage } from '../config/languages';
import { cacheAudio, getCachedAudio, prefetchAudio, type AudioPrefetchProgress } from './audioCache';
import { LINGVA_INSTANCES } from './lingva';
import { LANGUAGES } from '../config/languages';
import { lingvaFetch } from './lingvaClient';

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let activeLang: StudyLanguage = 'fr';
let speechGeneration = 0;

const inflightAudio = new Map<string, Promise<Uint8Array>>();

function stopCurrentAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

export function activateSpeechLang(lang: StudyLanguage): void {
  activeLang = lang;
}

export async function fetchStudyAudio(text: string): Promise<Uint8Array> {
  const key = text.trim();
  if (!key) throw new Error('Texto vacío');

  const cached = await getCachedAudio(key);
  if (cached) return cached;

  const pending = inflightAudio.get(key);
  if (pending) return pending;

  const promise = fetchStudyAudioRemote(key).finally(() => inflightAudio.delete(key));
  inflightAudio.set(key, promise);
  return promise;
}

async function fetchStudyAudioRemote(text: string): Promise<Uint8Array> {
  const lingvaCode = LANGUAGES[activeLang].lingvaCode;
  let lastError: unknown;

  for (const instance of LINGVA_INSTANCES) {
    try {
      const url = `${instance}/api/v1/audio/${lingvaCode}/${encodeURIComponent(text)}`;
      const response = await lingvaFetch(url);

      const data = (await response.json()) as { audio?: number[] };
      if (!data.audio?.length) {
        throw new Error('Audio vacío');
      }

      const bytes = new Uint8Array(data.audio);
      await cacheAudio(text, bytes);
      return bytes;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No se pudo obtener audio');
}

function playAudioBytes(bytes: Uint8Array, playbackRate = 1, generation = speechGeneration): Promise<void> {
  if (generation !== speechGeneration) return Promise.resolve();

  stopCurrentAudio();

  const blob = new Blob([new Uint8Array(bytes)], { type: 'audio/mpeg' });
  const objectUrl = URL.createObjectURL(blob);
  currentObjectUrl = objectUrl;

  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(objectUrl);
    audio.playbackRate = playbackRate;
    currentAudio = audio;

    audio.onended = () => {
      stopCurrentAudio();
      resolve();
    };

    audio.onerror = () => {
      stopCurrentAudio();
      reject(new Error('No se pudo reproducir audio'));
    };

    audio.play().catch((error) => {
      stopCurrentAudio();
      reject(error);
    });
  });
}

export function stopLingvaSpeech(): void {
  speechGeneration += 1;
  stopCurrentAudio();
}

export function speakWithLingva(text: string, playbackRate = 1): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve();

  const generation = speechGeneration;
  return fetchStudyAudio(trimmed).then((bytes) => {
    if (generation !== speechGeneration) return;
    return playAudioBytes(bytes, playbackRate, generation);
  });
}

export async function prefetchStudyAudio(
  texts: string[],
  options?: { onProgress?: (progress: AudioPrefetchProgress) => void },
): Promise<number> {
  return prefetchAudio(texts, fetchStudyAudio, options);
}

export function canUseNativeSpeech(): boolean {
  return Boolean(window.isSecureContext && window.speechSynthesis);
}
