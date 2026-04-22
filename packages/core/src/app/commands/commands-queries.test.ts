import { describe, expect, it } from "vitest";

import { Identity } from "../../domain/entities/identity.js";
import { SanctionsMatch } from "../../domain/entities/sanctions-match.js";
import { VerificationSession } from "../../domain/entities/verification-session.js";
import { PayloadContainsRawPII } from "../../domain/errors.js";
import { ISODateTime } from "../../domain/value-objects/iso-datetime.js";
import { PIIString } from "../../domain/value-objects/pii-string.js";
import { UUID } from "../../domain/value-objects/uuid.js";

import { NotFound } from "../errors.js";
import { FakeAuditLog } from "../ports/__fakes__/fake-audit-log.js";
import { FakeClock } from "../ports/__fakes__/fake-clock.js";
import { FakeEventBus } from "../ports/__fakes__/fake-event-bus.js";
import { FakeSanctionsScreening } from "../ports/__fakes__/fake-sanctions-screening.js";
import { FakeVerificationRepository } from "../ports/__fakes__/fake-verification-repository.js";
import { ExportAuditLog, VerifyAuditIntegrity } from "../queries/audit-queries.js";
import { GetSanctionsMatches } from "../queries/sanctions-queries.js";
import { GetVerificationStatus, ListVerifications } from "../queries/verification-queries.js";

import { AppendAuditEvent } from "./append-audit-event.js";
import { RefreshSanctionsLists } from "./refresh-sanctions-lists.js";
import { ScreenSanctions } from "./screen-sanctions.js";

const iso = ISODateTime.parse("2026-04-20T12:00:00.000Z");
const SUBJECT_ID = UUID.parse("aaaaaaaa-aaaa-4aaa-8aaa-000000000001");

describe("ScreenSanctions", () => {
  const makeDeps = () => ({
    clock: new FakeClock(iso),
    sanctions: new FakeSanctionsScreening(),
    repository: new FakeVerificationRepository(),
    auditLog: new FakeAuditLog(),
    eventBus: new FakeEventBus(),
  });

  it("persists matches above threshold + emits audit + event per match", async () => {
    const deps = makeDeps();
    await deps.repository.saveIdentity(
      Identity.create({
        id: SUBJECT_ID,
        fullName: PIIString.from("Ada Lovelace"),
        country: "CR",
        createdAt: iso,
      }),
    );
    const highConfidence = SanctionsMatch.create({
      id: UUID.parse("bbbbbbbb-bbbb-4bbb-8bbb-000000000001"),
      identityId: SUBJECT_ID,
      list: "OFAC_SDN",
      listEntryId: "E-1",
      confidence: 92,
      matchedName: "AL",
      detectedAt: iso,
    });
    const lowConfidence = SanctionsMatch.create({
      id: UUID.parse("bbbbbbbb-bbbb-4bbb-8bbb-000000000002"),
      identityId: SUBJECT_ID,
      list: "OFAC_SDN",
      listEntryId: "E-2",
      confidence: 55,
      matchedName: "AL2",
      detectedAt: iso,
    });
    deps.sanctions.queueMatches([highConfidence, lowConfidence]);

    const cmd = new ScreenSanctions(deps);
    const out = await cmd.execute({
      tenantId: "habitanexus",
      subjectId: SUBJECT_ID,
      subjectKind: "IDENTITY",
      subjectName: PIIString.from("Ada Lovelace"),
      subjectCountry: "CR",
    });

    expect(out.totalCandidates).toBe(2);
    expect(out.persistedMatches).toBe(1);
    expect(out.matchIds).toEqual([highConfidence.props.id]);

    const stored = await deps.repository.listMatchesBySubject({ subjectId: SUBJECT_ID });
    expect(stored).toHaveLength(1);

    const audited = deps.eventBus.published.filter((e) => e.eventType === "SanctionsMatchFound");
    expect(audited).toHaveLength(1);
  });

  it("throws NotFound when identity does not exist", async () => {
    const deps = makeDeps();
    const cmd = new ScreenSanctions(deps);
    await expect(
      cmd.execute({
        tenantId: "habitanexus",
        subjectId: UUID.parse("cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
        subjectKind: "IDENTITY",
        subjectName: PIIString.from("Unknown"),
        subjectCountry: "CR",
      }),
    ).rejects.toBeInstanceOf(NotFound);
  });
});

describe("RefreshSanctionsLists", () => {
  it("appends ListRefreshed audit + publishes event", async () => {
    const deps = {
      clock: new FakeClock(iso),
      sanctions: new FakeSanctionsScreening(),
      auditLog: new FakeAuditLog(),
      eventBus: new FakeEventBus(),
    };
    const cmd = new RefreshSanctionsLists(deps);
    const report = await cmd.execute({ actorKey: "cron:daily", source: "OFAC_SDN" });
    expect(report.source).toBe("OFAC_SDN");
    const report2 = await deps.auditLog.verify(1n, 1n);
    expect(report2.ok).toBe(true);
    expect(deps.eventBus.published[0]?.eventType).toBe("ListRefreshed");
  });
});

describe("AppendAuditEvent", () => {
  it("appends when payload is pre-redacted", async () => {
    const auditLog = new FakeAuditLog();
    const cmd = new AppendAuditEvent({ auditLog });
    const ev = await cmd.execute({
      eventType: "CustomOpsAction",
      actorKey: "ops:migrate-123",
      subjectKey: "sys:migration",
      payload: { kind: "backfill", count: 500 },
      occurredAt: iso,
    });
    expect(ev.props.seqNumber).toBe(1n);
  });

  it("rejects payloads containing forbidden PII keys", async () => {
    const auditLog = new FakeAuditLog();
    const cmd = new AppendAuditEvent({ auditLog });
    await expect(
      cmd.execute({
        eventType: "CustomOpsAction",
        actorKey: "ops:migrate-123",
        subjectKey: "sys:migration",
        payload: { fullName: "Ada Lovelace" },
        occurredAt: iso,
      }),
    ).rejects.toBeInstanceOf(PayloadContainsRawPII);
  });

  it("rejects nested forbidden keys", async () => {
    const auditLog = new FakeAuditLog();
    const cmd = new AppendAuditEvent({ auditLog });
    await expect(
      cmd.execute({
        eventType: "CustomOpsAction",
        actorKey: "ops:x",
        subjectKey: "sys:x",
        payload: { subject: { taxId: "1-1234-5678" } },
        occurredAt: iso,
      }),
    ).rejects.toBeInstanceOf(PayloadContainsRawPII);
  });
});

describe("GetVerificationStatus", () => {
  const repo = new FakeVerificationRepository();
  const sid = UUID.parse("dddddddd-dddd-4ddd-8ddd-000000000001");

  it("returns the session when present", async () => {
    await repo.saveSession(
      VerificationSession.create({
        id: sid,
        identityId: SUBJECT_ID,
        provider: "PERSONA",
        jurisdiction: "CR",
        startedAt: iso,
      }),
    );
    const q = new GetVerificationStatus({ repository: repo });
    const s = await q.execute({ sessionId: sid });
    expect(s.id).toBe(sid);
  });

  it("throws NotFound for unknown id", async () => {
    const emptyRepo = new FakeVerificationRepository();
    const q = new GetVerificationStatus({ repository: emptyRepo });
    await expect(
      q.execute({ sessionId: UUID.parse("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee") }),
    ).rejects.toBeInstanceOf(NotFound);
  });
});

describe("ListVerifications", () => {
  it("filters by status + respects limit", async () => {
    const repo = new FakeVerificationRepository();
    const subject = UUID.parse("ffffffff-ffff-4fff-8fff-000000000001");
    await repo.saveSession(
      VerificationSession.create({
        id: UUID.parse("ffffffff-ffff-4fff-8fff-000000000002"),
        identityId: subject,
        provider: "PERSONA",
        jurisdiction: "CR",
        startedAt: iso,
      }),
    );
    await repo.saveSession(
      VerificationSession.create({
        id: UUID.parse("ffffffff-ffff-4fff-8fff-000000000003"),
        identityId: subject,
        provider: "PERSONA",
        jurisdiction: "CR",
        startedAt: iso,
      }),
    );

    const q = new ListVerifications({ repository: repo });
    const out = await q.execute({ subjectId: subject, status: "INITIATED", limit: 1 });
    expect(out.sessions).toHaveLength(1);
    expect(out.total).toBe(1);
  });
});

describe("GetSanctionsMatches", () => {
  it("returns matches for subject", async () => {
    const repo = new FakeVerificationRepository();
    const subject = UUID.parse("99999999-9999-4999-8999-000000000001");
    await repo.saveMatch(
      SanctionsMatch.create({
        id: UUID.parse("99999999-9999-4999-8999-000000000002"),
        identityId: subject,
        list: "OFAC_SDN",
        listEntryId: "E-1",
        confidence: 85,
        matchedName: "X",
        detectedAt: iso,
      }),
    );
    const q = new GetSanctionsMatches({ repository: repo });
    const out = await q.execute({ subjectId: subject });
    expect(out.matches).toHaveLength(1);
    expect(out.total).toBe(1);
  });
});

describe("VerifyAuditIntegrity + ExportAuditLog", () => {
  it("verify returns ok for an untampered chain; export streams events in range", async () => {
    const log = new FakeAuditLog();
    await log.append({
      eventType: "ListRefreshed",
      actorKey: "a",
      subjectKey: "s",
      payload: {},
      occurredAt: iso,
    });
    const verifyQ = new VerifyAuditIntegrity({ auditLog: log });
    const exportQ = new ExportAuditLog({ auditLog: log });
    const report = await verifyQ.execute({ fromSeq: 1n, toSeq: 1n });
    expect(report.ok).toBe(true);
    const events: string[] = [];
    for await (const e of exportQ.execute({
      from: ISODateTime.parse("2026-04-20T11:00:00.000Z"),
      to: ISODateTime.parse("2026-04-20T13:00:00.000Z"),
    })) {
      events.push(e.props.eventType);
    }
    expect(events).toEqual(["ListRefreshed"]);
  });

  it("rejects inverted range", async () => {
    const log = new FakeAuditLog();
    const verifyQ = new VerifyAuditIntegrity({ auditLog: log });
    await expect(verifyQ.execute({ fromSeq: 10n, toSeq: 1n })).rejects.toBeInstanceOf(Error);
  });
});
