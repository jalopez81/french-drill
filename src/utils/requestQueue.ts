export interface RequestQueueOptions {
  concurrency?: number;
  minDelayMs?: number;
}

export function createRequestQueue(options: RequestQueueOptions = {}) {
  const concurrency = Math.max(1, options.concurrency ?? 1);
  const minDelayMs = Math.max(0, options.minDelayMs ?? 0);

  let active = 0;
  const pending: Array<() => void> = [];
  let lastStartedAt = 0;

  function pump(): void {
    while (active < concurrency && pending.length > 0) {
      const run = pending.shift();
      if (run) run();
    }
  }

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = async () => {
        active += 1;
        try {
          if (minDelayMs > 0) {
            const wait = minDelayMs - (Date.now() - lastStartedAt);
            if (wait > 0) await sleep(wait);
          }
          lastStartedAt = Date.now();
          resolve(await task());
        } catch (error) {
          reject(error);
        } finally {
          active -= 1;
          pump();
        }
      };

      pending.push(start);
      pump();
    });
  }

  return { enqueue };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(Math.max(1, concurrency), queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) return;
      await worker(item);
    }
  });
  await Promise.all(runners);
}
