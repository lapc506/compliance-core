import { expect, it } from "vitest";
import type { ClockPort } from "../clock-port.js";

/**
 * Contract suite for any ClockPort implementation.
 * Call inside a `describe(...)` block: `runClockContract(() => new MyClock())`.
 */
export function runClockContract(factory: () => ClockPort): void {
  it("returns a Date instance", () => {
    const clock = factory();
    const d = clock.now();
    expect(d).toBeInstanceOf(Date);
  });

  it("returns a fresh Date each call (no shared mutation)", () => {
    const clock = factory();
    const a = clock.now();
    const b = clock.now();
    expect(a).not.toBe(b);
  });

  it("advances monotonically (non-decreasing)", () => {
    const clock = factory();
    const a = clock.now().getTime();
    const b = clock.now().getTime();
    expect(b).toBeGreaterThanOrEqual(a);
  });
}
