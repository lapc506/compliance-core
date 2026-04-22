import { expect, it } from "vitest";
import { ISODateTime } from "../../../domain/value-objects/iso-datetime.js";
import type { AuditLogPort } from "../audit-log-port.js";

/**
 * Contract for any AuditLogPort implementation.
 * The `corrupt` hook lets the suite assert that `verify()` detects tampering
 * when the underlying storage is manipulated.
 */
export interface AuditLogContractHarness {
  port: AuditLogPort;
  /** Force-overwrite the `hash` of the event at `seq`, simulating corruption. */
  corruptHashAt(seq: bigint): Promise<void>;
}

export function runAuditLogContract(factory: () => AuditLogContractHarness): void {
  it("append() seals events with monotonic seqNumber starting at 1", async () => {
    const { port } = factory();
    const a = await port.append({
      eventType: "ListRefreshed",
      actorKey: "sys",
      subjectKey: "ofac",
      payload: {},
      occurredAt: ISODateTime.parse("2026-04-20T12:00:00.000Z"),
    });
    const b = await port.append({
      eventType: "ListRefreshed",
      actorKey: "sys",
      subjectKey: "un",
      payload: {},
      occurredAt: ISODateTime.parse("2026-04-20T12:00:01.000Z"),
    });
    expect(a.props.seqNumber).toBe(1n);
    expect(b.props.seqNumber).toBe(2n);
    expect(a.props.prevHash).not.toBe(a.props.hash);
    expect(b.props.prevHash).toBe(a.props.hash);
  });

  it("verify() returns ok for an untampered chain", async () => {
    const { port } = factory();
    for (let i = 0; i < 3; i += 1) {
      await port.append({
        eventType: "ListRefreshed",
        actorKey: "sys",
        subjectKey: `src-${i}`,
        payload: {},
        occurredAt: ISODateTime.parse("2026-04-20T12:00:00.000Z"),
      });
    }
    const report = await port.verify(1n, 3n);
    expect(report.ok).toBe(true);
    if (report.ok) expect(report.verifiedCount).toBe(3);
  });

  it("verify() detects tampering when a hash is overwritten", async () => {
    const harness = factory();
    for (let i = 0; i < 3; i += 1) {
      await harness.port.append({
        eventType: "ListRefreshed",
        actorKey: "sys",
        subjectKey: `src-${i}`,
        payload: {},
        occurredAt: ISODateTime.parse("2026-04-20T12:00:00.000Z"),
      });
    }
    await harness.corruptHashAt(2n);
    const report = await harness.port.verify(1n, 3n);
    expect(report.ok).toBe(false);
    if (!report.ok) {
      expect(report.brokenAt).toBe(2n);
    }
  });

  it("export() yields events within the period only", async () => {
    const { port } = factory();
    await port.append({
      eventType: "ListRefreshed",
      actorKey: "sys",
      subjectKey: "before",
      payload: {},
      occurredAt: ISODateTime.parse("2026-04-20T10:00:00.000Z"),
    });
    await port.append({
      eventType: "ListRefreshed",
      actorKey: "sys",
      subjectKey: "inside",
      payload: {},
      occurredAt: ISODateTime.parse("2026-04-20T12:00:00.000Z"),
    });
    await port.append({
      eventType: "ListRefreshed",
      actorKey: "sys",
      subjectKey: "after",
      payload: {},
      occurredAt: ISODateTime.parse("2026-04-20T14:00:00.000Z"),
    });
    const out: string[] = [];
    for await (const e of port.export({
      from: ISODateTime.parse("2026-04-20T11:00:00.000Z"),
      to: ISODateTime.parse("2026-04-20T13:00:00.000Z"),
    })) {
      out.push(e.props.subjectKey);
    }
    expect(out).toEqual(["inside"]);
  });
}
