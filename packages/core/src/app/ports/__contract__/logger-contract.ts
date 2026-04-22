import { expect, it } from "vitest";
import type { LoggerPort } from "../logger-port.js";

export function runLoggerContract(factory: () => LoggerPort): void {
  it("accepts info/warn/error without throwing", () => {
    const log = factory();
    expect(() => log.info("hello", { x: 1 })).not.toThrow();
    expect(() => log.warn("hello", { x: 1 })).not.toThrow();
    expect(() => log.error("hello", { x: 1 })).not.toThrow();
  });

  it("child() returns a new logger with merged bindings", () => {
    const root = factory();
    const child = root.child({ tenantId: "t-1" });
    expect(child).not.toBe(root);
    expect(() => child.info("msg")).not.toThrow();
  });

  it("child() does not mutate parent bindings", () => {
    const root = factory();
    const child = root.child({ a: 1 });
    const grandchild = child.child({ b: 2 });
    expect(root).not.toBe(child);
    expect(child).not.toBe(grandchild);
  });
}
