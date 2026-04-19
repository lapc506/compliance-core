import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import { InvalidHex32, InvalidTaxId, InvalidUuid } from "../errors.js";
import { Decimal } from "./decimal.js";
import { DocumentRef } from "./document-ref.js";
import { Hex32 } from "./hex32.js";
import { ISODateTime } from "./iso-datetime.js";
import { Jurisdiction } from "./jurisdiction.js";
import { PIIString } from "./pii-string.js";
import { TaxId } from "./tax-id.js";
import { UUID } from "./uuid.js";

describe("UUID", () => {
  it("parses valid v4 UUID", () => {
    const u = UUID.parse("550e8400-e29b-41d4-a716-446655440000");
    expect(u).toBe("550e8400-e29b-41d4-a716-446655440000");
  });
  it("rejects garbage", () => {
    expect(() => UUID.parse("not-a-uuid")).toThrow(InvalidUuid);
  });
  it("tryParse returns null instead of throwing", () => {
    expect(UUID.tryParse("bad")).toBeNull();
  });
});

describe("Hex32", () => {
  it("accepts 64 lowercase hex chars", () => {
    const h = Hex32.parse("a".repeat(64));
    expect(h).toBe("a".repeat(64));
  });
  it("rejects uppercase", () => {
    expect(() => Hex32.parse("A".repeat(64))).toThrow(InvalidHex32);
  });
  it("equals is timing-safe", () => {
    const a = Hex32.parse("a".repeat(64));
    const b = Hex32.parse("a".repeat(64));
    const c = Hex32.parse("b".repeat(64));
    expect(Hex32.equals(a, b)).toBe(true);
    expect(Hex32.equals(a, c)).toBe(false);
  });
  it("ZERO is 64 zeros", () => {
    expect(Hex32.ZERO).toBe("0".repeat(64));
  });
});

describe("ISODateTime", () => {
  it("accepts RFC3339 with Z", () => {
    const dt = ISODateTime.parse("2026-04-18T12:00:00Z");
    expect(dt).toBe("2026-04-18T12:00:00Z");
  });
  it("accepts offset notation", () => {
    const dt = ISODateTime.parse("2026-04-18T12:00:00-06:00");
    expect(dt).toBeDefined();
  });
  it("rejects naive timestamp", () => {
    expect(() => ISODateTime.parse("2026-04-18T12:00:00")).toThrow();
  });
});

describe("Jurisdiction", () => {
  it("accepts known codes", () => {
    expect(Jurisdiction.parse("CR")).toBe("CR");
    expect(Jurisdiction.parse("MX")).toBe("MX");
  });
  it("rejects unknown", () => {
    expect(() => Jurisdiction.parse("XX")).toThrow();
  });
});

describe("Decimal", () => {
  it("fromNumber preserves scale", () => {
    const d = Decimal.fromNumber(85.42, 2);
    expect(d.value).toBe(8542n);
    expect(d.scale).toBe(2);
    expect(d.toString()).toBe("85.42");
  });
  it("fromString parses", () => {
    const d = Decimal.fromString("-1.005");
    expect(d.toString()).toBe("-1.005");
  });
  it("equals across different scales", () => {
    const a = Decimal.fromString("1.5");
    const b = Decimal.fromString("1.50");
    expect(a.equals(b)).toBe(true);
  });
});

describe("PIIString", () => {
  it("toString returns [REDACTED]", () => {
    const p = PIIString.from("Luis Andres");
    expect(String(p)).toBe("[REDACTED]");
    expect(`${p}`).toBe("[REDACTED]");
  });
  it("JSON.stringify never leaks", () => {
    const p = PIIString.from("Luis Andres");
    expect(JSON.stringify({ name: p })).toBe('{"name":"[REDACTED]"}');
  });
  it("util.inspect never leaks", () => {
    const p = PIIString.from("Luis Andres");
    expect(inspect(p)).toBe("[REDACTED]");
  });
  it("unsafeReveal returns original", () => {
    const p = PIIString.from("Luis Andres");
    expect(p.unsafeReveal()).toBe("Luis Andres");
  });
  it("redactedTail shows last N chars", () => {
    const p = PIIString.from("1-1234-5678");
    expect(p.redactedTail(4)).toBe("*******5678");
  });
});

describe("TaxId", () => {
  it("parses CR cedula fisica", () => {
    const t = TaxId.parse({ country: "CR", value: "1-1234-5678" });
    expect(t.country).toBe("CR");
    expect(t.kind).toBe("CEDULA_FISICA");
  });
  it("parses MX RFC fisica (13 chars)", () => {
    const t = TaxId.parse({ country: "MX", value: "VECJ880326XXX" });
    expect(t.kind).toBe("RFC");
  });
  it("parses CO cedula", () => {
    const t = TaxId.parse({ country: "CO", value: "1020304050" });
    expect(t.kind).toBe("CEDULA_FISICA");
  });
  it("rejects bogus CR id", () => {
    expect(() => TaxId.parse({ country: "CR", value: "abc" })).toThrow(InvalidTaxId);
  });
  it("toString redacts value (only shows country + last 4)", () => {
    const t = TaxId.parse({ country: "CR", value: "1-1234-5678" });
    expect(t.toString()).toMatch(/^CR:\*+5678$/);
  });
  it("JSON.stringify does not leak value", () => {
    const t = TaxId.parse({ country: "CR", value: "1-1234-5678" });
    const json = JSON.stringify(t);
    expect(json).not.toContain("1234");
    expect(json).toContain("5678");
  });
  it("unsafeReveal returns original", () => {
    const t = TaxId.parse({ country: "CR", value: "1-1234-5678" });
    expect(t.unsafeReveal()).toBe("1-1234-5678");
  });
});

describe("DocumentRef", () => {
  it("redacts number in toJSON + util.inspect", () => {
    const d = DocumentRef.create({
      kind: "PASSPORT",
      number: "A12345678",
      issuedBy: "CR",
      issuedAt: ISODateTime.parse("2020-01-01T00:00:00Z"),
    });
    expect(JSON.stringify(d)).toContain("[REDACTED]");
    expect(inspect(d)).not.toContain("A12345678");
    expect(d.unsafeRevealNumber()).toBe("A12345678");
  });
});
