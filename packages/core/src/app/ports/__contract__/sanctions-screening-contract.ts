import { expect, it } from "vitest";
import { PIIString } from "../../../domain/value-objects/pii-string.js";
import { UUID } from "../../../domain/value-objects/uuid.js";
import type { SanctionsScreeningPort } from "../sanctions-screening-port.js";

export function runSanctionsScreeningContract(factory: () => SanctionsScreeningPort): void {
  it("screen() returns an array of matches (possibly empty)", async () => {
    const port = factory();
    const matches = await port.screen({
      kind: "IDENTITY",
      id: UUID.parse("44444444-4444-4444-8444-444444444444"),
      fullName: PIIString.from("Test Person"),
      country: "CR",
    });
    expect(Array.isArray(matches)).toBe(true);
  });

  it("getMatch() returns null for unknown id", async () => {
    const port = factory();
    const got = await port.getMatch(UUID.parse("55555555-5555-4555-8555-555555555555"));
    expect(got).toBeNull();
  });

  it("refreshLists() reports counts for the requested source", async () => {
    const port = factory();
    const report = await port.refreshLists("OFAC_SDN");
    expect(report.source).toBe("OFAC_SDN");
    expect(typeof report.entriesAdded).toBe("number");
  });
}
