import type { Unsubscribe } from "../event-bus-port.js";
import type { SecretsStorePort } from "../secrets-store-port.js";

export class FakeSecretsStore implements SecretsStorePort {
  private readonly store = new Map<string, string>();
  private readonly watchers = new Map<string, Set<(value: string) => void>>();

  set(path: string, value: string): void {
    this.store.set(path, value);
    const ws = this.watchers.get(path);
    if (ws) {
      for (const cb of ws) cb(value);
    }
  }

  async get(path: string): Promise<string> {
    const value = this.store.get(path);
    if (value === undefined) {
      throw new Error(`unknown secret path: ${path}`);
    }
    return value;
  }

  watch(path: string, cb: (value: string) => void): Unsubscribe {
    let set = this.watchers.get(path);
    if (!set) {
      set = new Set();
      this.watchers.set(path, set);
    }
    set.add(cb);
    let removed = false;
    return () => {
      if (removed) return;
      removed = true;
      set?.delete(cb);
    };
  }
}
