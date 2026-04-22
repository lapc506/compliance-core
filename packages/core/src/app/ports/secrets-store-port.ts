import type { Unsubscribe } from "./event-bus-port.js";

/**
 * SecretsStorePort — abstracted secret retrieval (Vault / sealed-secrets /
 * KMS). NEVER log or cache values in plaintext across request boundaries.
 *
 * Contracts:
 *  - `get(path)` returns the current secret value; caller is responsible for
 *    disposing / zeroing buffers if needed.
 *  - `watch(path, cb)` invokes `cb` on every rotation; adapters debounce to
 *    avoid storms during lease renewal.
 *  - Unknown paths MUST reject with a domain error (not `undefined`).
 */
export interface SecretsStorePort {
  get(path: string): Promise<string>;
  watch(path: string, cb: (value: string) => void): Unsubscribe;
}
