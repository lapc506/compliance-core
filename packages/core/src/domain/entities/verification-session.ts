import { VerificationStateMachine, type VerificationStatus } from "../services/state-machine.js";
import type { ISODateTime } from "../value-objects/iso-datetime.js";
import type { Jurisdiction } from "../value-objects/jurisdiction.js";
import type { UUID } from "../value-objects/uuid.js";

export type VerificationProvider = "PERSONA" | "ONDATO" | "INCODE" | "INTERNAL";
export type VerificationDecision = "PASS" | "FAIL" | "PENDING";

export interface VerificationSessionProps {
  readonly id: UUID;
  readonly identityId: UUID;
  readonly provider: VerificationProvider;
  readonly status: VerificationStatus;
  readonly decision: VerificationDecision;
  readonly providerRef: string | undefined;
  readonly jurisdiction: Jurisdiction;
  readonly startedAt: ISODateTime;
  readonly completedAt: ISODateTime | undefined;
  readonly expiresAt: ISODateTime | undefined;
  readonly replacesSessionId: UUID | undefined;
  readonly evidenceBlobIds: readonly UUID[];
  readonly failureReason: string | undefined;
}

export class VerificationSession {
  private constructor(public readonly props: VerificationSessionProps) {
    Object.freeze(this.props);
    Object.freeze(this);
  }

  static create(input: {
    id: UUID;
    identityId: UUID;
    provider: VerificationProvider;
    jurisdiction: Jurisdiction;
    startedAt: ISODateTime;
    providerRef?: string;
    evidenceBlobIds?: readonly UUID[];
    replacesSessionId?: UUID;
  }): VerificationSession {
    return new VerificationSession({
      id: input.id,
      identityId: input.identityId,
      provider: input.provider,
      jurisdiction: input.jurisdiction,
      startedAt: input.startedAt,
      status: "INITIATED",
      decision: "PENDING",
      providerRef: input.providerRef,
      completedAt: undefined,
      expiresAt: undefined,
      replacesSessionId: input.replacesSessionId,
      evidenceBlobIds: input.evidenceBlobIds ?? [],
      failureReason: undefined,
    });
  }

  transition(
    to: VerificationStatus,
    patch?: Partial<VerificationSessionProps>,
  ): VerificationSession {
    VerificationStateMachine.assertTransition(this.props.status, to);
    return new VerificationSession({ ...this.props, ...patch, status: to });
  }

  markCompleted(
    decision: VerificationDecision,
    at: ISODateTime,
    providerRef?: string,
  ): VerificationSession {
    const to: VerificationStatus = decision === "PASS" ? "VERIFIED" : "FAILED";
    const patch: Partial<VerificationSessionProps> = { decision, completedAt: at };
    const withRef = providerRef !== undefined ? { ...patch, providerRef } : patch;
    return this.transition(to, withRef);
  }

  markPending(providerRef: string): VerificationSession {
    return this.transition("PENDING", { providerRef });
  }

  markExpired(at: ISODateTime): VerificationSession {
    return this.transition("EXPIRED", { completedAt: at });
  }

  get status(): VerificationStatus {
    return this.props.status;
  }
  get id(): UUID {
    return this.props.id;
  }
}
