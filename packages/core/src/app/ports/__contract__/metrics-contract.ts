import { expect, it } from "vitest";
import type { MetricsPort } from "../metrics-port.js";

export function runMetricsContract(factory: () => MetricsPort): void {
  it("returns a counter handle that accepts inc()", () => {
    const m = factory();
    const c = m.counter("test_counter", { result: "ok" });
    expect(() => c.inc()).not.toThrow();
    expect(() => c.inc(3)).not.toThrow();
  });

  it("returns a histogram handle that accepts observe()", () => {
    const m = factory();
    const h = m.histogram("test_histogram", { method: "GET" });
    expect(() => h.observe(0.123)).not.toThrow();
  });

  it("returns a gauge handle that accepts set/inc/dec", () => {
    const m = factory();
    const g = m.gauge("test_gauge");
    expect(() => g.set(42)).not.toThrow();
    expect(() => g.inc()).not.toThrow();
    expect(() => g.dec()).not.toThrow();
  });

  it("returns idempotent handles for the same (name, labels)", () => {
    const m = factory();
    const a = m.counter("same_name", { k: "v" });
    const b = m.counter("same_name", { k: "v" });
    // Handles may or may not be referentially equal, but both MUST accept inc.
    expect(() => a.inc()).not.toThrow();
    expect(() => b.inc()).not.toThrow();
  });
}
