import { expect, it, vi } from "vitest";
import type { SecretsStorePort } from "../secrets-store-port.js";

export function runSecretsStoreContract(
  factory: () => { port: SecretsStorePort; set: (path: string, value: string) => void },
): void {
  it("returns stored value for a known path", async () => {
    const { port, set } = factory();
    set("/app/key", "secret-42");
    await expect(port.get("/app/key")).resolves.toBe("secret-42");
  });

  it("rejects for unknown path (never resolves undefined)", async () => {
    const { port } = factory();
    await expect(port.get("/does/not/exist")).rejects.toBeInstanceOf(Error);
  });

  it("watch() is invoked on rotation", async () => {
    const { port, set } = factory();
    set("/rotating", "v1");
    const cb = vi.fn();
    port.watch("/rotating", cb);
    set("/rotating", "v2");
    // Adapters may debounce; assert eventual invocation.
    await new Promise((r) => setTimeout(r, 10));
    expect(cb).toHaveBeenCalledWith("v2");
  });

  it("watch() unsubscribe stops further invocations", async () => {
    const { port, set } = factory();
    set("/off", "v1");
    const cb = vi.fn();
    const off = port.watch("/off", cb);
    off();
    set("/off", "v2");
    await new Promise((r) => setTimeout(r, 10));
    expect(cb).not.toHaveBeenCalled();
  });
}
