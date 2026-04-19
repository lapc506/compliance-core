/**
 * AuditChainService — SHA-256 hash chain + tamper detection.
 *
 * This is the legal defense: CR SUGEF + DGA audits verify the chain to confirm
 * no event was tampered, removed, or reordered. Must be pure domain (no I/O).
 *
 * Chain formula (per task-14 spec):
 *   hash_N = sha256( seqN | prevHash | eventType | actorKey | subjectKey | canonicalJson(payload) | occurredAt )
 *
 * Genesis: prevHash = Hex32.ZERO, seqNumber = 1n.
 */

import { Hex32 } from "../value-objects/hex32.js";
import type { ISODateTime } from "../value-objects/iso-datetime.js";
import { canonicalJson } from "./canonical-json.js";
import { sha256Hex } from "./sha256.js";

export interface AuditEventInput {
  eventType: string;
  actorKey: string; // opaque identifier, NEVER PII
  subjectKey: string; // opaque identifier, NEVER PII
  payload: Record<string, unknown>; // must already be redacted
  occurredAt: ISODateTime;
}

export interface SealedAuditEvent extends AuditEventInput {
  seqNumber: bigint;
  prevHash: Hex32;
  hash: Hex32;
}

export type VerificationResult =
  | { ok: true; count: number }
  | {
      ok: false;
      brokenAt: bigint;
      reason: "hash-mismatch" | "seq-gap" | "prev-hash-mismatch";
    };

export class AuditChainService {
  /**
   * Compute the hash for an event. Pure — no I/O.
   */
  static computeHash(event: AuditEventInput, seqNumber: bigint, prevHash: Hex32): Hex32 {
    const input = [
      seqNumber.toString(),
      prevHash,
      event.eventType,
      event.actorKey,
      event.subjectKey,
      canonicalJson(event.payload),
      event.occurredAt,
    ].join("|");
    return sha256Hex(input);
  }

  /**
   * Append an event given the previous state.
   * Returns the sealed event. Caller persists via repository.
   */
  append(
    event: AuditEventInput,
    previous: { seqNumber: bigint; hash: Hex32 } | null,
  ): SealedAuditEvent {
    const seqNumber = (previous?.seqNumber ?? 0n) + 1n;
    const prevHash = previous?.hash ?? Hex32.ZERO;
    const hash = AuditChainService.computeHash(event, seqNumber, prevHash);
    return { ...event, seqNumber, prevHash, hash };
  }

  /**
   * Verify an entire chain. Returns the first breakpoint or ok.
   * Events MUST be sorted by seqNumber ascending.
   */
  verify(events: readonly SealedAuditEvent[]): VerificationResult {
    if (events.length === 0) return { ok: true, count: 0 };

    let expectedSeq = 1n;
    let expectedPrevHash = Hex32.ZERO;

    for (const e of events) {
      if (e.seqNumber !== expectedSeq) {
        return { ok: false, brokenAt: e.seqNumber, reason: "seq-gap" };
      }
      if (!Hex32.equals(e.prevHash, expectedPrevHash)) {
        return { ok: false, brokenAt: e.seqNumber, reason: "prev-hash-mismatch" };
      }
      const recomputed = AuditChainService.computeHash(e, e.seqNumber, e.prevHash);
      if (!Hex32.equals(recomputed, e.hash)) {
        return { ok: false, brokenAt: e.seqNumber, reason: "hash-mismatch" };
      }
      expectedSeq += 1n;
      expectedPrevHash = e.hash;
    }

    return { ok: true, count: events.length };
  }
}
