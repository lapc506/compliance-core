/**
 * PIIString wraps personal data so it's redacted by default in:
 * - toString()
 * - JSON.stringify()
 * - util.inspect() (via custom symbol)
 * - console.log()
 *
 * Access raw value only via .unsafeReveal() — code calling that MUST be
 * audited under security/pii label.
 */

import { inspect } from "node:util";

const REDACTED = "[REDACTED]";
const internalStore = new WeakMap<PIIString, string>();

export class PIIString {
  private constructor(v: string) {
    internalStore.set(this, v);
  }

  static from(v: string): PIIString {
    return new PIIString(v);
  }

  unsafeReveal(): string {
    // The constructor always writes to the WeakMap, so this is defined.
    return internalStore.get(this) as string;
  }

  toString(): string {
    return REDACTED;
  }

  toJSON(): string {
    return REDACTED;
  }

  /** Node util.inspect integration so console.log never leaks. */
  [inspect.custom](): string {
    return REDACTED;
  }

  /** Redacted preview — last N chars only, useful for audit UI. */
  redactedTail(n = 4): string {
    const raw = internalStore.get(this) as string;
    if (raw.length <= n) return "*".repeat(raw.length);
    return `${"*".repeat(raw.length - n)}${raw.slice(-n)}`;
  }
}
