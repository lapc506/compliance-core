import { InvalidISODateTime } from "../errors.js";

// RFC3339 with required timezone offset
const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export type ISODateTime = string & { readonly __brand: "ISODateTime" };

export const ISODateTime = {
  parse(input: unknown): ISODateTime {
    if (typeof input !== "string" || !ISO_REGEX.test(input)) {
      throw new InvalidISODateTime("Expected RFC3339 with timezone offset");
    }
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) {
      throw new InvalidISODateTime("Unparseable date");
    }
    return input as ISODateTime;
  },
  tryParse(input: unknown): ISODateTime | null {
    try {
      return ISODateTime.parse(input);
    } catch {
      return null;
    }
  },
  fromDate(d: Date): ISODateTime {
    return d.toISOString() as ISODateTime;
  },
  now(): ISODateTime {
    return ISODateTime.fromDate(new Date());
  },
  toDate(v: ISODateTime): Date {
    return new Date(v);
  },
} as const;
