import { describe, expect, it } from "vitest";
import {
  AlreadyReviewed,
  InvalidVerificationStateTransition,
  UBOPercentageExceedsLimit,
} from "../errors.js";
import { ISODateTime } from "../value-objects/iso-datetime.js";
import { TaxId } from "../value-objects/tax-id.js";
import { UUID } from "../value-objects/uuid.js";
import { BusinessEntity } from "./business-entity.js";
import { Identity } from "./identity.js";
import { SanctionsMatch } from "./sanctions-match.js";
import { VerificationSession } from "./verification-session.js";

const now = ISODateTime.parse("2026-04-18T12:00:00Z");
const sessionId = UUID.parse("550e8400-e29b-41d4-a716-446655440000");
const identityId = UUID.parse("660e8400-e29b-41d4-a716-446655440001");

describe("Identity", () => {
  it("creates with defaults", () => {
    const id = Identity.create({
      id: identityId,
      fullName: "Luis Andres",
      country: "CR",
      createdAt: now,
    });
    expect(id.props.documents).toEqual([]);
    expect(id.props.createdAt).toBe(now);
    expect(id.props.updatedAt).toBe(now);
    expect(String(id.props.fullName)).toBe("[REDACTED]");
  });

  it("rejects future DOB", () => {
    expect(() =>
      Identity.create({
        id: identityId,
        fullName: "X",
        country: "CR",
        createdAt: now,
        dateOfBirth: ISODateTime.parse("2099-01-01T00:00:00Z"),
      }),
    ).toThrow();
  });

  it("withVerification returns new instance (immutability)", () => {
    const id = Identity.create({
      id: identityId,
      fullName: "Luis Andres",
      country: "CR",
      createdAt: now,
    });
    const later = ISODateTime.parse("2026-04-18T13:00:00Z");
    const updated = id.withVerification(sessionId, later);
    expect(updated).not.toBe(id);
    expect(updated.props.verificationSessionIds).toEqual([sessionId]);
    expect(id.props.verificationSessionIds).toEqual([]);
  });

  it("JSON.stringify redacts fullName", () => {
    const id = Identity.create({
      id: identityId,
      fullName: "Luis Andres",
      country: "CR",
      createdAt: now,
    });
    const json = JSON.stringify(id);
    expect(json).not.toContain("Luis Andres");
    expect(json).toContain("[REDACTED]");
  });
});

describe("BusinessEntity", () => {
  it("rejects UBO total > 100%", () => {
    const taxId = TaxId.parse({ country: "CR", value: "3-101-234567" });
    const b = BusinessEntity.create({
      id: identityId,
      legalName: "ACME SA",
      registrationId: taxId,
      country: "CR",
      formationDate: now,
      createdAt: now,
    });
    const bWith60 = b.addUBO({ identityId, ownershipPercent: 60, role: "SHAREHOLDER" }, now);
    expect(() =>
      bWith60.addUBO({ identityId, ownershipPercent: 45, role: "SHAREHOLDER" }, now),
    ).toThrow(UBOPercentageExceedsLimit);
  });

  it("addUBO accumulates up to 100%", () => {
    const taxId = TaxId.parse({ country: "CR", value: "3-101-234567" });
    const b = BusinessEntity.create({
      id: identityId,
      legalName: "ACME SA",
      registrationId: taxId,
      country: "CR",
      formationDate: now,
      createdAt: now,
    });
    const b2 = b
      .addUBO({ identityId, ownershipPercent: 50, role: "SHAREHOLDER" }, now)
      .addUBO({ identityId, ownershipPercent: 50, role: "SHAREHOLDER" }, now);
    expect(b2.props.ubos).toHaveLength(2);
  });
});

describe("VerificationSession", () => {
  it("INITIATED → PENDING is valid", () => {
    const s = VerificationSession.create({
      id: sessionId,
      identityId,
      provider: "PERSONA",
      jurisdiction: "CR",
      startedAt: now,
    });
    const s2 = s.markPending("persona-inq-123");
    expect(s2.status).toBe("PENDING");
    expect(s2.props.providerRef).toBe("persona-inq-123");
  });

  it("INITIATED → VERIFIED throws", () => {
    const s = VerificationSession.create({
      id: sessionId,
      identityId,
      provider: "PERSONA",
      jurisdiction: "CR",
      startedAt: now,
    });
    expect(() => s.transition("VERIFIED")).toThrow(InvalidVerificationStateTransition);
  });

  it("terminal states cannot transition", () => {
    const s = VerificationSession.create({
      id: sessionId,
      identityId,
      provider: "PERSONA",
      jurisdiction: "CR",
      startedAt: now,
    });
    const verified = s.markPending("ref").markCompleted("PASS", now, "ref");
    expect(() => verified.transition("FAILED")).toThrow(InvalidVerificationStateTransition);
  });

  it("markCompleted with PASS → VERIFIED", () => {
    const s = VerificationSession.create({
      id: sessionId,
      identityId,
      provider: "PERSONA",
      jurisdiction: "CR",
      startedAt: now,
    });
    const completed = s.markPending("ref").markCompleted("PASS", now);
    expect(completed.status).toBe("VERIFIED");
    expect(completed.props.decision).toBe("PASS");
  });

  it("markCompleted with FAIL → FAILED", () => {
    const s = VerificationSession.create({
      id: sessionId,
      identityId,
      provider: "PERSONA",
      jurisdiction: "CR",
      startedAt: now,
    });
    const failed = s.markPending("ref").markCompleted("FAIL", now);
    expect(failed.status).toBe("FAILED");
  });
});

describe("SanctionsMatch", () => {
  it("creates with PENDING review status", () => {
    const m = SanctionsMatch.create({
      id: sessionId,
      identityId,
      list: "OFAC_SDN",
      listEntryId: "OFAC-123",
      confidence: 87,
      matchedName: "Vladimir Putin",
      matchedAliases: [],
      detectedAt: now,
    });
    expect(m.props.reviewStatus).toBe("PENDING");
  });

  it("confirm → CONFIRMED_MATCH", () => {
    const m = SanctionsMatch.create({
      id: sessionId,
      identityId,
      list: "OFAC_SDN",
      listEntryId: "OFAC-123",
      confidence: 87,
      matchedName: "Vladimir Putin",
      matchedAliases: [],
      detectedAt: now,
    }).confirm("reviewer:luis", now, "Strong visual match");
    expect(m.props.reviewStatus).toBe("CONFIRMED_MATCH");
    expect(m.props.reviewedBy).toBe("reviewer:luis");
  });

  it("re-reviewing throws AlreadyReviewed", () => {
    const m = SanctionsMatch.create({
      id: sessionId,
      identityId,
      list: "OFAC_SDN",
      listEntryId: "OFAC-123",
      confidence: 87,
      matchedName: "Vladimir Putin",
      matchedAliases: [],
      detectedAt: now,
    }).confirm("reviewer:luis", now);
    expect(() => m.markFalsePositive("reviewer:ana", now)).toThrow(AlreadyReviewed);
  });

  it("confidence out of range throws", () => {
    expect(() =>
      SanctionsMatch.create({
        id: sessionId,
        identityId,
        list: "OFAC_SDN",
        listEntryId: "OFAC-123",
        confidence: 150,
        matchedName: "X",
        matchedAliases: [],
        detectedAt: now,
      }),
    ).toThrow();
  });
});
