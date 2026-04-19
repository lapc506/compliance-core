import { afterEach, vi } from "vitest";

/**
 * Root Vitest setup.
 *
 * Tests OPT IN to deterministic time via `useFixedClock(iso)`. Tests that
 * measure real durations (rate-limit backoff, circuit breaker half-open) do
 * NOT call this helper and keep wall-clock time.
 *
 * After every test we tear down fake timers to prevent leakage across files.
 */
export function useFixedClock(iso: string): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

afterEach(() => {
  if (vi.isFakeTimers()) {
    vi.useRealTimers();
  }
});
