import type { StudyLanguage } from '../config/languages';

const memoryCache = new Map<string, Uint8Array>();
let activeLang: StudyLanguage = 'fr';

function dbName(lang: StudyLanguage): string {
  return `french-drill-audio-${lang}`;
}

function cacheKey(text: string): string {
  return text.trim();
}

function openDb(lang: StudyLanguage): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName(lang), 1);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir audio cache'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('clips')) {
        db.createObjectStore('clips');
      }
    };
  });
}

export function activateAudioLang(lang: StudyLanguage): void {
  activeLang = lang;
  memoryCache.clear();
}

export async function getCachedAudio(text: string): Promise<Uint8Array | null> {
  const key = cacheKey(text);
  if (!key) return null;

  const memKey = `${activeLang}::${key}`;
  const inMemory = memoryCache.get(memKey);
  if (inMemory) return inMemory;

  try {
    const db = await openDb(activeLang);
    const bytes = await new Promise<Uint8Array | null>((resolve, reject) => {
      const tx = db.transaction('clips', 'readonly');
      const store = tx.objectStore('clips');
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result instanceof ArrayBuffer) {
          resolve(new Uint8Array(result));
          return;
        }
        if (result instanceof Uint8Array) {
          resolve(result);
          return;
        }
        resolve(null);
      };
      request.onerror = () => reject(request.error);
    });

    if (bytes) memoryCache.set(memKey, bytes);
    return bytes;
  } catch {
    return null;
  }
}

export async function cacheAudio(text: string, bytes: Uint8Array): Promise<void> {
  const key = cacheKey(text);
  if (!key || bytes.length === 0) return;

  const memKey = `${activeLang}::${key}`;
  memoryCache.set(memKey, bytes);

  try {
    const db = await openDb(activeLang);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('clips', 'readwrite');
      const store = tx.objectStore('clips');
      const request = store.put(new Uint8Array(bytes), key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // memory cache still helps this session
  }
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) return;
      await worker(item);
    }
  });

  await Promise.all(runners);
}

export async function prefetchAudio(
  texts: string[],
  fetcher: (text: string) => Promise<Uint8Array>,
  concurrency = 3,
): Promise<number> {
  const keys = [...new Set(texts.map(cacheKey).filter(Boolean))];
  const missing: string[] = [];

  for (const key of keys) {
    const cached = await getCachedAudio(key);
    if (!cached) missing.push(key);
  }

  let fetched = 0;

  await mapWithConcurrency(missing, concurrency, async (key) => {
    try {
      const bytes = await fetcher(key);
      await cacheAudio(key, bytes);
      fetched += 1;
    } catch {
      // skip failed clips
    }
  });

  return keys.length - missing.length + fetched;
}
