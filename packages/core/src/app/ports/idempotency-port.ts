/**
 * IdempotencyPort — deduplicates side-effectful commands by `key`.
 *
 * Contracts:
 *  - `run(key, ttlMs, fn)` executes `fn` at most once within the TTL window
 *    per `key`. Subsequent calls within the window MUST return the cached
 *    result synchronously (no re-execution).
 *  - If `fn` rejects, the failure MUST NOT be cached — the next call with
 *    the same key re-runs `fn`. (Success caching prevents duplicate writes;
 *    failure caching would create stuck states.)
 *  - `ttlMs` MUST be > 0; adapters reject non-positive values.
 *  - Concurrent calls with the same key MUST serialize: only one execution
 *    proceeds; others await its result.
 */
export interface IdempotencyPort {
  run<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
}
