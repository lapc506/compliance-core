import { InvalidJurisdiction } from "../errors.js";

/**
 * ISO 3166-1 alpha-2 country codes for the jurisdictions compliance-core covers.
 * Expand as the ecosystem expands. Kept explicit (not `string`) so code + validation
 * stay in lockstep.
 */
export const JURISDICTIONS = ["CR", "MX", "CO", "PA", "GT", "HN", "NI", "SV", "DO", "US"] as const;
export type Jurisdiction = (typeof JURISDICTIONS)[number];

export const Jurisdiction = {
  parse(input: unknown): Jurisdiction {
    if (typeof input !== "string" || !JURISDICTIONS.includes(input as Jurisdiction)) {
      throw new InvalidJurisdiction(
        `Unknown jurisdiction; expected one of ${JURISDICTIONS.join(",")}`,
      );
    }
    return input as Jurisdiction;
  },
  tryParse(input: unknown): Jurisdiction | null {
    return typeof input === "string" && JURISDICTIONS.includes(input as Jurisdiction)
      ? (input as Jurisdiction)
      : null;
  },
  isJurisdiction(input: unknown): input is Jurisdiction {
    return typeof input === "string" && JURISDICTIONS.includes(input as Jurisdiction);
  },
} as const;
