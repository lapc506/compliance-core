import { ComplianceEvent } from "../../../domain/entities/compliance-event.js";
import { AuditChainService } from "../../../domain/services/audit-chain-service.js";
import { Hex32 } from "../../../domain/value-objects/hex32.js";
import type { ISODateTime } from "../../../domain/value-objects/iso-datetime.js";
import type { AppendInput, AuditLogPort, IntegrityReport, Period } from "../audit-log-port.js";

/**
 * In-memory AuditLogPort. Exposes `corruptHashAt` so the contract suite can
 * assert tamper detection.
 */
export class FakeAuditLog implements AuditLogPort {
  private readonly events: Array<{
    seqNumber: bigint;
    prevHash: string;
    hash: string;
    eventType: string;
    actorKey: string;
    subjectKey: string;
    payload: Record<string, unknown>;
    occurredAt: ISODateTime;
  }> = [];
  private readonly chain = new AuditChainService();

  async append(input: AppendInput): Promise<ComplianceEvent> {
    const last = this.events.at(-1);
    const sealed = this.chain.append(
      input,
      last ? { seqNumber: last.seqNumber, hash: Hex32.parse(last.hash) } : null,
    );
    this.events.push({
      seqNumber: sealed.seqNumber,
      prevHash: sealed.prevHash,
      hash: sealed.hash,
      eventType: sealed.eventType,
      actorKey: sealed.actorKey,
      subjectKey: sealed.subjectKey,
      payload: { ...sealed.payload },
      occurredAt: sealed.occurredAt,
    });
    return ComplianceEvent.ofSealed({
      seqNumber: sealed.seqNumber,
      prevHash: sealed.prevHash,
      hash: sealed.hash,
      eventType: sealed.eventType,
      actorKey: sealed.actorKey,
      subjectKey: sealed.subjectKey,
      payload: { ...sealed.payload },
      occurredAt: sealed.occurredAt,
    });
  }

  async verify(fromSeq: bigint, toSeq: bigint): Promise<IntegrityReport> {
    const slice = this.events
      .filter((e) => e.seqNumber >= fromSeq && e.seqNumber <= toSeq)
      .map((e) => ({
        seqNumber: e.seqNumber,
        prevHash: Hex32.parse(e.prevHash),
        hash: Hex32.parse(e.hash),
        eventType: e.eventType,
        actorKey: e.actorKey,
        subjectKey: e.subjectKey,
        payload: e.payload,
        occurredAt: e.occurredAt,
      }));
    const result = this.chain.verify(slice);
    if (result.ok) return { ok: true, verifiedCount: result.count };
    return { ok: false, brokenAt: result.brokenAt, reason: result.reason };
  }

  async *export(period: Period): AsyncIterable<ComplianceEvent> {
    for (const e of this.events) {
      if (e.occurredAt >= period.from && e.occurredAt <= period.to) {
        yield ComplianceEvent.ofSealed({
          seqNumber: e.seqNumber,
          prevHash: Hex32.parse(e.prevHash),
          hash: Hex32.parse(e.hash),
          eventType: e.eventType,
          actorKey: e.actorKey,
          subjectKey: e.subjectKey,
          payload: e.payload,
          occurredAt: e.occurredAt,
        });
      }
    }
  }

  async *stream(fromSeq: bigint): AsyncIterable<ComplianceEvent> {
    for (const e of this.events) {
      if (e.seqNumber < fromSeq) continue;
      yield ComplianceEvent.ofSealed({
        seqNumber: e.seqNumber,
        prevHash: Hex32.parse(e.prevHash),
        hash: Hex32.parse(e.hash),
        eventType: e.eventType,
        actorKey: e.actorKey,
        subjectKey: e.subjectKey,
        payload: e.payload,
        occurredAt: e.occurredAt,
      });
    }
  }

  /** Test hook: simulate storage tampering. */
  async corruptHashAt(seq: bigint): Promise<void> {
    const target = this.events.find((e) => e.seqNumber === seq);
    if (!target) throw new Error(`no event at seq=${seq}`);
    // Flip one hex char (deterministic) so chain verification fails.
    const first = target.hash[0] ?? "0";
    const replacement = first === "0" ? "1" : "0";
    target.hash = `${replacement}${target.hash.slice(1)}`;
  }
}
