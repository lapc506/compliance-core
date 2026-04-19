import { AuditChainService } from "../services/audit-chain-service.js";
import { Hex32 } from "../value-objects/hex32.js";
import type { ISODateTime } from "../value-objects/iso-datetime.js";

export interface ComplianceEventProps {
  readonly seqNumber: bigint;
  readonly prevHash: Hex32;
  readonly hash: Hex32;
  readonly eventType: string;
  readonly actorKey: string;
  readonly subjectKey: string;
  readonly payload: Record<string, unknown>;
  readonly occurredAt: ISODateTime;
}

/**
 * Self-validating compliance event. Constructing with a mismatched hash throws
 * — guarantees that any ComplianceEvent in memory has passed chain validation.
 */
export class ComplianceEvent {
  private constructor(public readonly props: ComplianceEventProps) {
    const recomputed = AuditChainService.computeHash(
      {
        eventType: props.eventType,
        actorKey: props.actorKey,
        subjectKey: props.subjectKey,
        payload: props.payload,
        occurredAt: props.occurredAt,
      },
      props.seqNumber,
      props.prevHash,
    );
    if (!Hex32.equals(recomputed, props.hash)) {
      // Intentionally generic — never log the offending hash body.
      throw new Error(`ComplianceEvent hash mismatch at seq=${props.seqNumber}`);
    }
    Object.freeze(this.props);
    Object.freeze(this);
  }

  static ofSealed(props: ComplianceEventProps): ComplianceEvent {
    return new ComplianceEvent(props);
  }
}
