import { createHash } from "node:crypto";
import type { Hex32 } from "../value-objects/hex32.js";

export function sha256Hex(input: string | Uint8Array): Hex32 {
  return createHash("sha256").update(input).digest("hex") as Hex32;
}
