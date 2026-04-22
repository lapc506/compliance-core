import type { IdempotencyPort } from "../idempotency-port.js";

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

/**
 * In-memory idempotency store.
 * - Caches successful results for `ttlMs`.
 * - Never caches failures.
 * - Serializes concurrent calls for the same key.
 */
export class FakeIdempotency implements IdempotencyPort {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<unknown>>();

  async run<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    if (ttlMs <= 0) throw new Error(`ttlMs must be > 0 (got ${ttlMs})`);
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.value as T;
    }
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<T>;

    const promise = (async () => {
      try {
        const value = await fn();
        this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, promise);
    return promise;
  }
}
