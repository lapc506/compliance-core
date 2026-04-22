import type { ClockPort } from "../clock-port.js";

/**
 * FakeClock — deterministic clock for tests.
 * Advance manually via `advance(ms)` or `set(iso)`.
 */
export class FakeClock implements ClockPort {
  private current: number;

  constructor(initial: string | number | Date = "2026-01-01T00:00:00.000Z") {
    this.current =
      initial instanceof Date
        ? initial.getTime()
        : typeof initial === "number"
          ? initial
          : new Date(initial).getTime();
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current += ms;
  }

  set(at: string | Date): void {
    this.current = at instanceof Date ? at.getTime() : new Date(at).getTime();
  }
}
