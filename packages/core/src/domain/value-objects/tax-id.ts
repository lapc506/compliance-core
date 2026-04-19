import { InvalidTaxId } from "../errors.js";
import type { Jurisdiction } from "./jurisdiction.js";
import { PIIString } from "./pii-string.js";

/**
 * Multi-jurisdiction tax ID (cedula, RFC, NIT, passport, etc.).
 * Stored as PIIString internally — redacted by default in logs.
 * Full reveal available via unsafeReveal() for provider API calls.
 */

export type TaxIdKind = "CEDULA_FISICA" | "CEDULA_JURIDICA" | "RFC" | "NIT" | "DIMEX" | "PASSPORT";

// Per-country validators. Each returns the `kind` inferred or throws.
const VALIDATORS: Record<Jurisdiction, (v: string) => TaxIdKind> = {
  CR: (v) => {
    // Cedula fisica 9 digits (1-2345-6789 or 123456789)
    const digits = v.replace(/-/g, "");
    if (/^[1-9]\d{8}$/.test(digits)) return "CEDULA_FISICA";
    // Cedula juridica 10 digits starting with 3
    if (/^3\d{9}$/.test(digits)) return "CEDULA_JURIDICA";
    // DIMEX 11-12 digits
    if (/^\d{11,12}$/.test(digits)) return "DIMEX";
    throw new InvalidTaxId("Invalid CR tax id format");
  },
  MX: (v) => {
    // RFC fisica: 4 letters + YYMMDD + 3 alphanum = 13 chars
    if (/^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/i.test(v)) return "RFC";
    // RFC moral: 3 letters + YYMMDD + 3 alphanum = 12 chars
    if (/^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/i.test(v)) return "RFC";
    throw new InvalidTaxId("Invalid MX RFC format");
  },
  CO: (v) => {
    const digits = v.replace(/[.-]/g, "");
    // Cedula 6-10 digits
    if (/^\d{6,10}$/.test(digits)) return "CEDULA_FISICA";
    // NIT 9-10 digits
    if (/^\d{9,10}$/.test(digits)) return "NIT";
    throw new InvalidTaxId("Invalid CO tax id format");
  },
  PA: (v) => {
    if (/^[A-Z0-9-]{5,20}$/i.test(v)) return "CEDULA_FISICA";
    throw new InvalidTaxId("Invalid PA tax id format");
  },
  GT: (v) => {
    if (/^\d{7,13}$/.test(v.replace(/-/g, ""))) return "CEDULA_FISICA";
    throw new InvalidTaxId("Invalid GT tax id format");
  },
  HN: (v) => {
    if (/^\d{13}$/.test(v.replace(/-/g, ""))) return "CEDULA_FISICA";
    throw new InvalidTaxId("Invalid HN tax id format");
  },
  NI: (v) => {
    if (/^\d{14}[A-Z]?$/i.test(v.replace(/-/g, ""))) return "CEDULA_FISICA";
    throw new InvalidTaxId("Invalid NI tax id format");
  },
  SV: (v) => {
    if (/^\d{8}-?\d$/.test(v)) return "CEDULA_FISICA";
    throw new InvalidTaxId("Invalid SV tax id format");
  },
  DO: (v) => {
    if (/^\d{11}$/.test(v.replace(/-/g, ""))) return "CEDULA_FISICA";
    throw new InvalidTaxId("Invalid DO tax id format");
  },
  US: (v) => {
    // Passport alphanumeric 6-12 chars
    if (/^[A-Z0-9]{6,12}$/i.test(v)) return "PASSPORT";
    throw new InvalidTaxId("Invalid US identifier format");
  },
};

export interface TaxIdInput {
  country: Jurisdiction;
  value: string;
  kind?: TaxIdKind;
}

export class TaxId {
  private readonly _value: PIIString;

  private constructor(
    public readonly country: Jurisdiction,
    public readonly kind: TaxIdKind,
    value: string,
  ) {
    this._value = PIIString.from(value);
  }

  static parse(input: TaxIdInput): TaxId {
    const validator = VALIDATORS[input.country];
    if (!validator) {
      throw new InvalidTaxId(`No validator for country ${input.country}`);
    }
    const kind = validator(input.value);
    if (input.kind && input.kind !== kind) {
      throw new InvalidTaxId(`Kind mismatch: expected ${input.kind}, got ${kind}`);
    }
    return new TaxId(input.country, kind, input.value);
  }

  /** Use for API calls to providers. Requires security audit. */
  unsafeReveal(): string {
    return this._value.unsafeReveal();
  }

  /** Safe for logs + UI — last 4 chars only. */
  redacted(): string {
    return `${this.country}:${this._value.redactedTail(4)}`;
  }

  toString(): string {
    return this.redacted();
  }

  toJSON(): { country: Jurisdiction; kind: TaxIdKind; value: string } {
    return { country: this.country, kind: this.kind, value: this.redacted() };
  }
}
