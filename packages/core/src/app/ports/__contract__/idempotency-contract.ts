import { expect, it, vi } from "vitest";
import type { IdempotencyPort } from "../idempotency-port.js";

export function runIdempotencyContract(factory: () => IdempotencyPort): void {
  it("executes fn once per key within TTL and caches result", async () => {
    const port = factory();
    const fn = vi.fn(async () => "value-1");
    const a = await port.run("k-1", 60_000, fn);
    const b = await port.run("k-1", 60_000, fn);
    expect(a).toBe("value-1");
    expect(b).toBe("value-1");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures — retry re-executes", async () => {
    const port = factory();
    let attempt = 0;
    const fn = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("first call fails");
      return "ok";
    });
    await expect(port.run("k-retry", 60_000, fn)).rejects.toThrow("first call fails");
    const result = await port.run("k-retry", 60_000, fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("rejects non-positive TTL", async () => {
    const port = factory();
    await expect(port.run("k-zero", 0, async () => "x")).rejects.toBeInstanceOf(Error);
    await expect(port.run("k-neg", -1, async () => "x")).rejects.toBeInstanceOf(Error);
  });

  it("serializes concurrent calls with same key", async () => {
    const port = factory();
    const fn = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 5));
      return "once";
    });
    const results = await Promise.all([
      port.run("k-conc", 60_000, fn),
      port.run("k-conc", 60_000, fn),
      port.run("k-conc", 60_000, fn),
    ]);
    expect(results).toEqual(["once", "once", "once"]);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("isolates keys", async () => {
    const port = factory();
    const a = await port.run("k-a", 60_000, async () => "A");
    const b = await port.run("k-b", 60_000, async () => "B");
    expect(a).toBe("A");
    expect(b).toBe("B");
  });
}
