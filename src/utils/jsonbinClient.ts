const BIN_ID = import.meta.env.VITE_JSONBIN_BIN_ID as string | undefined;
const ACCESS_KEY = import.meta.env.VITE_JSONBIN_ACCESS_KEY as string | undefined;

function apiUrl(): string {
  if (!BIN_ID) throw new Error('VITE_JSONBIN_BIN_ID no configurado');
  return `https://api.jsonbin.io/v3/b/${BIN_ID}`;
}

function authHeaders(): HeadersInit {
  if (!ACCESS_KEY) throw new Error('VITE_JSONBIN_ACCESS_KEY no configurado');
  return {
    'X-Access-Key': ACCESS_KEY,
    'Content-Type': 'application/json',
  };
}

export function isJsonBinConfigured(): boolean {
  return Boolean(BIN_ID?.trim() && ACCESS_KEY?.trim());
}

export async function fetchState<T>(): Promise<T | null> {
  const response = await fetch(apiUrl(), {
    method: 'GET',
    headers: authHeaders(),
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`JSONBin GET falló (${response.status})${detail ? `: ${detail}` : ''}`);
  }

  const body = (await response.json()) as { record?: T };
  return body.record ?? null;
}

export async function saveState<T>(data: T): Promise<void> {
  const response = await fetch(apiUrl(), {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`JSONBin PUT falló (${response.status})${detail ? `: ${detail}` : ''}`);
  }
}
