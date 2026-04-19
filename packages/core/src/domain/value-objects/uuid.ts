import { z } from "zod";
import { InvalidUuid } from "../errors.js";

const schema = z.string().uuid();

export type UUID = string & { readonly __brand: "UUID" };

export const UUID = {
  parse(input: unknown): UUID {
    const r = schema.safeParse(input);
    if (!r.success)
      throw new InvalidUuid(`Invalid UUID: ${r.error.issues[0]?.message ?? "unknown"}`);
    return r.data as UUID;
  },
  tryParse(input: unknown): UUID | null {
    const r = schema.safeParse(input);
    return r.success ? (r.data as UUID) : null;
  },
  isUuid(input: unknown): input is UUID {
    return schema.safeParse(input).success;
  },
} as const;
