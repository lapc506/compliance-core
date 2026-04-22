/**
 * ClockPort — abstracts wall-clock access so commands and services are testable
 * under `useFixedClock()` (vitest.setup.ts) without mocking `Date` directly.
 *
 * Implementations MUST return a new Date instance on every call (no caching)
 * and MUST NOT perform I/O.
 */
export interface ClockPort {
  /** Current instant, as a fresh Date (not mutated-shared). */
  now(): Date;
}
