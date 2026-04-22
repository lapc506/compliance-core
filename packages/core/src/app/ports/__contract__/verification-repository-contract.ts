import { expect, it } from "vitest";
import { Identity } from "../../../domain/entities/identity.js";
import { SanctionsMatch } from "../../../domain/entities/sanctions-match.js";
import { VerificationSession } from "../../../domain/entities/verification-session.js";
import { ISODateTime } from "../../../domain/value-objects/iso-datetime.js";
import { PIIString } from "../../../domain/value-objects/pii-string.js";
import { UUID } from "../../../domain/value-objects/uuid.js";
import type { VerificationRepositoryPort } from "../verification-repository-port.js";

export function runVerificationRepositoryContract(factory: () => VerificationRepositoryPort): void {
  const iso = ISODateTime.parse("2026-04-20T12:00:00.000Z");

  it("saveIdentity + getIdentity round-trip", async () => {
    const repo = factory();
    const id = UUID.parse("66666666-6666-4666-8666-666666666666");
    const identity = Identity.create({
      id,
      fullName: PIIString.from("Ada Lovelace"),
      country: "CR",
      createdAt: iso,
    });
    await repo.saveIdentity(identity);
    const loaded = await repo.getIdentity(id);
    expect(loaded).not.toBeNull();
    expect(loaded?.props.country).toBe("CR");
  });

  it("getIdentity returns null for unknown id", async () => {
    const repo = factory();
    const missing = await repo.getIdentity(UUID.parse("77777777-7777-4777-8777-777777777777"));
    expect(missing).toBeNull();
  });

  it("saveSession is idempotent for same id (upsert semantics)", async () => {
    const repo = factory();
    const sid = UUID.parse("88888888-8888-4888-8888-888888888888");
    const iid = UUID.parse("99999999-9999-4999-8999-999999999999");
    const s = VerificationSession.create({
      id: sid,
      identityId: iid,
      provider: "PERSONA",
      jurisdiction: "CR",
      startedAt: iso,
    });
    await repo.saveSession(s);
    await repo.saveSession(s);
    const reloaded = await repo.getSession(sid);
    expect(reloaded?.id).toBe(sid);
  });

  it("getSessionByProviderRef locates session by provider ref", async () => {
    const repo = factory();
    const s = VerificationSession.create({
      id: UUID.parse("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      identityId: UUID.parse("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      provider: "PERSONA",
      jurisdiction: "CR",
      startedAt: iso,
      providerRef: "persona-inq-xyz",
    });
    await repo.saveSession(s);
    const found = await repo.getSessionByProviderRef("persona-inq-xyz");
    expect(found?.id).toBe(s.id);
  });

  it("listMatchesBySubject filters by status", async () => {
    const repo = factory();
    const subject = UUID.parse("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    const m1 = SanctionsMatch.create({
      id: UUID.parse("dddddddd-dddd-4ddd-8ddd-dddddddddd01"),
      identityId: subject,
      list: "OFAC_SDN",
      listEntryId: "E1",
      confidence: 90,
      matchedName: "X",
      detectedAt: iso,
    });
    const m2 = SanctionsMatch.create({
      id: UUID.parse("dddddddd-dddd-4ddd-8ddd-dddddddddd02"),
      identityId: subject,
      list: "UN",
      listEntryId: "E2",
      confidence: 85,
      matchedName: "Y",
      detectedAt: iso,
    });
    await repo.saveMatch(m1);
    await repo.saveMatch(m2);
    const pending = await repo.listMatchesBySubject({ subjectId: subject, status: "PENDING" });
    expect(pending).toHaveLength(2);
  });
}
