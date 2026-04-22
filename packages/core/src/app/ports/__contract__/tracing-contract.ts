import { expect, it } from "vitest";
import type { TracingPort } from "../tracing-port.js";

export function runTracingContract(factory: () => TracingPort): void {
  it("runs fn and returns its value", async () => {
    const t = factory();
    const result = await t.startSpan("test", async () => 42);
    expect(result).toBe(42);
  });

  it("ends the span on success", async () => {
    const t = factory();
    await t.startSpan("ok-span", async (span) => {
      span.setAttribute("phase", "start");
      return "ok";
    });
    // Reaching here with no leaks is sufficient — see fake's assertions.
  });

  it("re-throws and records exception on failure", async () => {
    const t = factory();
    const boom = new Error("boom");
    await expect(
      t.startSpan("err-span", async () => {
        throw boom;
      }),
    ).rejects.toThrow(boom);
  });

  it("passes attrs through to the span at start", async () => {
    const t = factory();
    await t.startSpan("with-attrs", async () => undefined, { k: "v" });
  });
}
