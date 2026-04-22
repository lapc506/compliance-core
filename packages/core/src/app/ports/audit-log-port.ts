import type { ComplianceEvent } from "../../domain/entities/compliance-event.js";
import type { ISODateTime } from "../../domain/value-objects/iso-datetime.js";

/**
 * AuditLogPort — append-only compliance log with SHA-256 hash chain.
 *
 * Contract:
 *  - `append()` persists a new event. `seqNumber`, `prevHash`, `hash` are
 *    assigned by the adapter (via AuditChainService). Returns the sealed
 *    ComplianceEvent.
 *  - `verify(fromSeq, toSeq)` recomputes the chain and returns an
 *    IntegrityReport. Used by daily cron + pre-export.
 *  - `export(period)` streams events within a time range (legal export).
 *  - `stream(fromSeq)` streams all events from a sequence number (follower
 *    replication / warm-standby).
 */

export type IntegrityReport =
  | { readonly ok: true; readonly verifiedCount: number }
  | {
      readonly ok: false;
      readonly brokenAt: bigint;
      readonly reason: "hash-mismatch" | "seq-gap" | "prev-hash-mismatch";
    };

export interface Period {
  readonly from: ISODateTime;
  readonly to: ISODateTime;
}

/** Input shape for `append` — chain fields are computed by the adapter. */
export type AppendInput = {
  readonly eventType: string;
  readonly actorKey: string;
  readonly subjectKey: string;
  readonly payload: Record<string, unknown>;
  readonly occurredAt: ISODateTime;
};

export interface AuditLogPort {
  append(input: AppendInput): Promise<ComplianceEvent>;
  verify(fromSeq: bigint, toSeq: bigint): Promise<IntegrityReport>;
  export(period: Period): AsyncIterable<ComplianceEvent>;
  stream(fromSeq: bigint): AsyncIterable<ComplianceEvent>;
}
