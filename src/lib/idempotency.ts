type CachedResponse = {
  status: number;
  body: unknown;
  createdAt: number;
};

const idempotencyStore = new Map<string, CachedResponse>();

const TTL_MS = 24 * 60 * 60 * 1000; // 24 jam

export function getCachedResponse(
  key: string
): CachedResponse | undefined {
  const cached = idempotencyStore.get(key);

  if (!cached) {
    return undefined;
  }

  if (Date.now() - cached.createdAt > TTL_MS) {
    idempotencyStore.delete(key);
    return undefined;
  }

  return cached;
}

export function setCachedResponse(
  key: string,
  status: number,
  body: unknown
) {
  idempotencyStore.set(key, {
    status,
    body,
    createdAt: Date.now(),
  });
}