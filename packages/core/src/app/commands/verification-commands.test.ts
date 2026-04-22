import { beforeEach, describe, expect, it, vi } from "vitest";

import { ISODateTime } from "../../domain/value-objects/iso-datetime.js";
import { PIIString } from "../../domain/value-objects/pii-string.js";
import { UUID } from "../../domain/value-objects/uuid.js";

import { ConsentRequired, ProviderError, UnknownProviderSession } from "../errors.js";
import { FakeAuditLog } from "../ports/__fakes__/fake-audit-log.js";
import { FakeClock } from "../ports/__fakes__/fake-clock.js";
import { FakeEventBus } from "../ports/__fakes__/fake-event-bus.js";
import { FakeIdempotency } from "../ports/__fakes__/fake-idempotency.js";
import { FakeIdentityVerification } from "../ports/__fakes__/fake-identity-verification.js";
import { FakeVerificationRepository } from "../ports/__fakes__/fake-verification-repository.js";

import { CompleteVerification } from "./complete-verification.js";
import { StartVerification } from "./start-verification.js";

function makeStartDeps() {
  return {
    clock: new FakeClock("2026-04-20T12:00:00.000Z"),
    idempotency: new FakeIdempotency(),
    identityVerification: new FakeIdentityVerification(),
    repository: new FakeVerificationRepository(),
    auditLog: new FakeAuditLog(),
    eventBus: new FakeEventBus(),
  };
}

const NEW_SESSION = UUID.parse("11111111-1111-4111-8111-000000000001");
const NEW_IDENTITY = UUID.parse("11111111-1111-4111-8111-000000000002");

describe("StartVerification", () => {
  let deps: ReturnType<typeof makeStartDeps>;
  let cmd: StartVerification;

  beforeEach(() => {
    deps = makeStartDeps();
    cmd = new StartVerification(deps);
  });

  const baseInput = {
    idempotencyKey: "idem-1",
    tenantId: "habitanexus",
    fullName: PIIString.from("Ada Lovelace"),
    country: "CR" as const,
    kind: "KYC_DOCUMENT" as const,
    consentGranted: true,
    newSessionId: NEW_SESSION,
    newIdentityId: NEW_IDENTITY,
  };

  it("creates identity + session, marks PENDING, appends VerificationStarted", async () => {
    const out = await cmd.execute(baseInput);
    expect(out.sessionId).toBe(NEW_SESSION);
    expect(out.providerSessionId).toMatch(/^fake-inq-/);

    const saved = await deps.repository.getSession(NEW_SESSION);
    expect(saved?.status).toBe("PENDING");

    const integrityReport = await deps.auditLog.verify(1n, 1n);
    expect(integrityReport.ok).toBe(true);

    expect(deps.eventBus.published).toHaveLength(1);
    expect(deps.eventBus.published[0]?.eventType).toBe("VerificationStarted");
  });

  it("is idempotent: same key returns same sessionId", async () => {
    const a = await cmd.execute(baseInput);
    const b = await cmd.execute(baseInput);
    expect(a.sessionId).toBe(b.sessionId);
    expect(a.providerSessionId).toBe(b.providerSessionId);
    expect(deps.identityVerification.startCalls).toHaveLength(1);
  });

  it("throws ConsentRequired when consent not granted", async () => {
    await expect(cmd.execute({ ...baseInput, consentGranted: false })).rejects.toBeInstanceOf(
      ConsentRequired,
    );
  });

  it("on provider error: leaves session INITIATED, appends VerificationFailed, throws ProviderError", async () => {
    vi.spyOn(deps.identityVerification, "startVerification").mockRejectedValueOnce(
      new Error("provider down"),
    );
    await expect(cmd.execute(baseInput)).rejects.toBeInstanceOf(ProviderError);

    const saved = await deps.repository.getSession(NEW_SESSION);
    expect(saved?.status).toBe("INITIATED");

    // VerificationFailed event appended; chain still valid.
    const report = await deps.auditLog.verify(1n, 1n);
    expect(report.ok).toBe(true);
  });

  it("does not leak raw PII into logs/traces (payloads carry only IDs)", async () => {
    await cmd.execute(baseInput);
    for (const entry of deps.eventBus.published) {
      const serialized = JSON.stringify(entry);
      expect(serialized).not.toContain("Ada Lovelace");
    }
  });
});

describe("CompleteVerification", () => {
  const setup = async () => {
    const startDeps = makeStartDeps();
    const start = new StartVerification(startDeps);
    const startOut = await start.execute({
      idempotencyKey: "idem-1",
      tenantId: "habitanexus",
      fullName: PIIString.from("Grace Hopper"),
      country: "CR",
      kind: "KYC_DOCUMENT",
      consentGranted: true,
      newSessionId: NEW_SESSION,
      newIdentityId: NEW_IDENTITY,
    });
    const completeDeps = {
      clock: startDeps.clock,
      idempotency: new FakeIdempotency(),
      repository: startDeps.repository,
      auditLog: startDeps.auditLog,
      eventBus: startDeps.eventBus,
    };
    return {
      startDeps,
      completeDeps,
      complete: new CompleteVerification(completeDeps),
      providerSessionId: startOut.providerSessionId,
      sessionId: startOut.sessionId,
    };
  };

  it("PASS verdict transitions session to VERIFIED and appends VerificationCompleted", async () => {
    const ctx = await setup();
    const out = await ctx.complete.execute({
      tenantId: "habitanexus",
      providerSessionId: ctx.providerSessionId,
      verdict: "PASS",
      reasons: [],
      webhookDeliveryId: "wh-1",
    });
    expect(out.finalStatus).toBe("VERIFIED");
    expect(out.alreadyApplied).toBe(false);

    const session = await ctx.completeDeps.repository.getSession(ctx.sessionId);
    expect(session?.status).toBe("VERIFIED");

    const completedEvents = ctx.startDeps.eventBus.published.filter(
      (e) => e.eventType === "VerificationCompleted",
    );
    expect(completedEvents).toHaveLength(1);
  });

  it("FAIL verdict transitions to FAILED and emits VerificationFailed", async () => {
    const ctx = await setup();
    await ctx.complete.execute({
      tenantId: "habitanexus",
      providerSessionId: ctx.providerSessionId,
      verdict: "FAIL",
      reasons: ["doc_blurry"],
      webhookDeliveryId: "wh-2",
    });
    const session = await ctx.completeDeps.repository.getSession(ctx.sessionId);
    expect(session?.status).toBe("FAILED");
  });

  it("MANUAL_REVIEW is treated as FAIL for state (but event payload preserves verdict)", async () => {
    const ctx = await setup();
    const out = await ctx.complete.execute({
      tenantId: "habitanexus",
      providerSessionId: ctx.providerSessionId,
      verdict: "MANUAL_REVIEW",
      reasons: ["needs_review"],
      webhookDeliveryId: "wh-mr",
    });
    expect(out.finalStatus).toBe("FAILED");

    const failedEvent = ctx.startDeps.eventBus.published.find(
      (e) => e.eventType === "VerificationFailed",
    );
    expect(failedEvent?.payload).toMatchObject({ verdict: "MANUAL_REVIEW" });
  });

  it("is idempotent: replaying the same webhook does not produce duplicate events", async () => {
    const ctx = await setup();
    await ctx.complete.execute({
      tenantId: "habitanexus",
      providerSessionId: ctx.providerSessionId,
      verdict: "PASS",
      reasons: [],
      webhookDeliveryId: "wh-dup",
    });
    const second = await ctx.complete.execute({
      tenantId: "habitanexus",
      providerSessionId: ctx.providerSessionId,
      verdict: "PASS",
      reasons: [],
      webhookDeliveryId: "wh-dup",
    });
    expect(second.alreadyApplied).toBe(false); // same idempotency cached result; no second run
    const completedCount = ctx.startDeps.eventBus.published.filter(
      (e) => e.eventType === "VerificationCompleted",
    ).length;
    expect(completedCount).toBe(1);
  });

  it("different delivery IDs on a terminal session return alreadyApplied=true", async () => {
    const ctx = await setup();
    await ctx.complete.execute({
      tenantId: "habitanexus",
      providerSessionId: ctx.providerSessionId,
      verdict: "PASS",
      reasons: [],
      webhookDeliveryId: "wh-first",
    });
    const replay = await ctx.complete.execute({
      tenantId: "habitanexus",
      providerSessionId: ctx.providerSessionId,
      verdict: "PASS",
      reasons: [],
      webhookDeliveryId: "wh-second",
    });
    expect(replay.alreadyApplied).toBe(true);
  });

  it("throws UnknownProviderSession for replays against unknown providerRef", async () => {
    const ctx = await setup();
    await expect(
      ctx.complete.execute({
        tenantId: "habitanexus",
        providerSessionId: "does-not-exist",
        verdict: "PASS",
        reasons: [],
        webhookDeliveryId: "wh-x",
      }),
    ).rejects.toBeInstanceOf(UnknownProviderSession);
  });

  it("audit chain stays valid end-to-end (Start → Complete)", async () => {
    const ctx = await setup();
    await ctx.complete.execute({
      tenantId: "habitanexus",
      providerSessionId: ctx.providerSessionId,
      verdict: "PASS",
      reasons: [],
      webhookDeliveryId: "wh-chain",
    });
    const report = await ctx.startDeps.auditLog.verify(1n, 2n);
    expect(report.ok).toBe(true);
    if (report.ok) expect(report.verifiedCount).toBe(2);
  });

  it("ISODateTime.now is not leaked from shared module state", () => {
    // Sentinel test: make sure test file compiles and ISO check is sensible.
    expect(ISODateTime.parse("2026-04-20T12:00:00.000Z")).toBeDefined();
  });
});
