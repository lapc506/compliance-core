import { timingSafeEqual } from "node:crypto";
import { InvalidHex32 } from "../errors.js";

// SHA-256 hex = 64 lowercase hex chars
const HEX32_REGEX = /^[0-9a-f]{64}$/;

export type Hex32 = string & { readonly __brand: "Hex32" };

export const Hex32 = {
  parse(input: unknown): Hex32 {
    if (typeof input !== "string" || !HEX32_REGEX.test(input)) {
      throw new InvalidHex32("Expected 64 lowercase hex chars");
    }
    return input as Hex32;
  },
  tryParse(input: unknown): Hex32 | null {
    return typeof input === "string" && HEX32_REGEX.test(input) ? (input as Hex32) : null;
  },
  /**
   * Timing-safe equality. MUST be used for audit chain verification to prevent
   * timing side-channel attacks.
   */
  equals(a: Hex32, b: Hex32): boolean {
    const aBuf = Buffer.from(a, "hex");
    const bBuf = Buffer.from(b, "hex");
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  },
  ZERO: "0".repeat(64) as unknown as Hex32,
} as const;
