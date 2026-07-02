import { createRequestQueue, sleep } from './requestQueue';

const RETRY_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 4;

/** Cola global: una petición Lingva a la vez con pausa entre ellas. */
const lingvaQueue = createRequestQueue({ concurrency: 1, minDelayMs: 1000 });

function retryDelayMs(response: Response | null, attempt: number): number {
  const retryAfter = response?.headers.get('Retry-After');
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  }
  
  // Base: 2000ms, Exponente: 2, Techo: 20000ms
  // Esto aumenta el tiempo de espera mucho más rápido tras cada fallo
  const baseDelay = 2000;
  const jitter = Math.random() * 1000;
  return Math.min(baseDelay * Math.pow(2, attempt), 20000) + jitter;
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url);
      lastResponse = response;

      if (RETRY_STATUSES.has(response.status)) {
        if (attempt < MAX_RETRIES) {
          await sleep(retryDelayMs(response, attempt));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await sleep(retryDelayMs(lastResponse, attempt));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Petición fallida');
}

/** Petición rate-limited a Lingva con reintentos ante 429/5xx. */
export function lingvaFetch(url: string): Promise<Response> {
  return lingvaQueue.enqueue(() => fetchWithRetry(url));
}